import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { ActivityLog, ACTION_CATEGORY } from '../models/ActivityLog.js';
import { AppNotification } from '../models/AppNotification.js';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { formatTicketCode, generateCode } from '../utils/codes.js';
import { Counter, nextTicketSequence } from '../models/Counter.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { REPAIR_TICKETS } from './data/repairs.js';
import { BRANCHES, STAFF } from './data/staff.js';
import { CUSTOMERS } from './data/customers.js';
import { ACTIVITY_SEED, NOTIFICATION_SEED } from './data/activity.js';
import { INVENTORY_ITEMS } from './data/inventory.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { SEED_PASSWORD } from './manifest.js';

const isFresh = process.argv.includes('--fresh');

function heading(text: string): void {
  console.log(`\n\x1b[1m${text}\x1b[0m`);
}

async function seedBranches(): Promise<Map<string, mongoose.Types.ObjectId>> {
  heading('Branches');
  const byCode = new Map<string, mongoose.Types.ObjectId>();
  for (const branch of BRANCHES) {
    const doc = await Branch.findOneAndUpdate(
      { code: branch.code },
      { $set: { ...branch, isActive: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    byCode.set(branch.code, doc._id);
    console.log(`  ✓ ${branch.code}  ${branch.name} (${branch.city})`);
  }
  return byCode;
}

async function seedStaff(branches: Map<string, mongoose.Types.ObjectId>): Promise<void> {
  heading(`Employees — shared password: ${SEED_PASSWORD}`);
  for (const person of STAFF) {
    const existing = await User.findOne({ email: person.email }).select('+password');
    if (existing) {
      existing.name = person.name;
      existing.phone = person.phone;
      existing.role = person.role;
      existing.locale = person.locale;
      existing.branch = person.branchCode ? branches.get(person.branchCode) : undefined;
      existing.isActive = true;
      await existing.save({ validateBeforeSave: false });
    } else {
      await User.create({
        name: person.name,
        email: person.email,
        phone: person.phone,
        password: SEED_PASSWORD,
        role: person.role,
        locale: person.locale,
        branch: person.branchCode ? branches.get(person.branchCode) : undefined,
        isActive: true,
      });
    }
    const scope = person.branchCode ?? 'all branches';
    console.log(`  ✓ ${person.role.padEnd(18)} ${person.email.padEnd(38)} ${scope}`);
  }
}

function at(daysAgo: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seedActivity(): Promise<void> {
  heading('Audit trail');
  await ActivityLog.deleteMany({});
  const users = await User.find({}).select('name email role branch');
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const documents = ACTIVITY_SEED.map((entry) => {
    const actor = byEmail.get(entry.actorEmail);
    return {
      action: entry.action,
      category: ACTION_CATEGORY[entry.action],
      messageKey: entry.messageKey,
      messageParams: entry.messageParams,
      actor: actor?._id,
      actorName: actor?.name ?? entry.actorEmail,
      actorRole: actor?.role,
      branch: actor?.branch,
      entityType: entry.entityType,
      entityLabel: entry.entityLabel,
      createdAt: at(entry.daysAgo, entry.hour, entry.minute),
      updatedAt: at(entry.daysAgo, entry.hour, entry.minute),
    };
  });
  await ActivityLog.insertMany(documents);
  console.log(`  ✓ ${documents.length} entries across the last 14 days`);
}

async function seedCustomers(branches: Map<string, mongoose.Types.ObjectId>): Promise<void> {
  heading('Customers and devices');
  await Customer.deleteMany({});
  await Device.deleteMany({});
  let deviceTotal = 0;
  for (const entry of CUSTOMERS) {
    const { devices, branchCode, ...customerFields } = entry;
    const customer = await Customer.create({
      ...customerFields,
      branch: branches.get(branchCode),
      customerCode: generateCode('CUS', 6),
      isActive: true,
    });
    const created = await Device.insertMany(
      devices.map((device) => {
        const { model, ...rest } = device;
        return {
          ...rest,
          modelName: model,
          customer: customer._id,
          branch: customer.branch,
          isActive: true,
        };
      })
    );
    deviceTotal += created.length;
    console.log(`  ✓ ${customer.customerCode}  ${customer.name.padEnd(26)} ${created.length} device(s)`);
  }
  console.log(`  ${CUSTOMERS.length} customers · ${deviceTotal} devices`);
}

async function seedRepairs(): Promise<void> {
  heading('Repair tickets');
  await RepairTicket.deleteMany({});
  await Counter.deleteMany({ _id: /^repair_ticket_/ });
  const customers = await Customer.find({}).lean();
  const devices = await Device.find({}).lean();
  const users = await User.find({}).select('name role').lean();
  const findCustomer = (fragment: string) => customers.find((c) => c.name.includes(fragment));
  const findDevice = (customerId: string, fragment: string) =>
    devices.find(
      (d) =>
        String(d.customer) === customerId &&
        `${d.brand} ${d.modelName}`.toLowerCase().includes(fragment.toLowerCase())
    );
  const findUser = (name: string) => users.find((u) => u.name === name);
  const created: Array<{ code: string; status: string; technician?: string }> = [];
  for (const entry of REPAIR_TICKETS) {
    const customer = findCustomer(entry.customer);
    if (!customer) {
      console.warn(`  ! skipped: customer "${entry.customer}" not found`);
      continue;
    }
    const device = findDevice(String(customer._id), entry.device);
    if (!device) {
      console.warn(`  ! skipped: device "${entry.device}" not found for ${customer.name}`);
      continue;
    }
    const technician = entry.technician ? findUser(entry.technician) : undefined;
    const sequence = await nextTicketSequence(new Date().getFullYear());
    const code = formatTicketCode(sequence);
    const openedAt = at(entry.openedDaysAgo, 9, 30);
    const history: Array<Record<string, unknown>> = [
      {
        from: null,
        to: 'received',
        at: openedAt,
        byName: 'Ahmed Gamal Sherif',
        byRole: 'receptionist',
        note: 'Ticket opened at the counter',
      },
    ];
    let previous: string = 'received';
    for (const step of entry.journey ?? []) {
      history.push({
        from: previous,
        to: step.status,
        at: at(step.daysAgo, 11, 15),
        byName: technician?.name ?? 'Karim Fathy Mansour',
        byRole: technician?.role ?? 'manager',
        note: step.note,
      });
      previous = step.status;
    }
    if (previous !== entry.status) {
      history.push({
        from: previous,
        to: entry.status,
        at: at(entry.statusDaysAgo ?? entry.openedDaysAgo, 14, 20),
        byName: technician?.name ?? 'Karim Fathy Mansour',
        byRole: technician?.role ?? 'manager',
      });
    }
    const readyAt = at(entry.statusDaysAgo ?? entry.openedDaysAgo, 14, 20);
    await RepairTicket.create({
      code,
      customer: customer._id,
      device: device._id,
      branch: device.branch,
      technician: technician?._id,
      status: entry.status,
      priority: entry.priority,
      issue: entry.issue,
      diagnosis: entry.diagnosis,
      estimatedCost: entry.estimatedCost,
      finalCost: entry.finalCost,
      customerApproved: entry.customerApproved,
      customerApprovedAt: entry.customerApproved ? at(entry.openedDaysAgo - 1, 16, 0) : undefined,
      notes: entry.notes,
      warrantyDays: entry.warrantyDays ?? 90,
      completedAt: entry.status === 'ready' || entry.status === 'delivered' ? readyAt : undefined,
      deliveredAt: entry.status === 'delivered' ? readyAt : undefined,
      statusHistory: history,
      createdAt: openedAt,
      updatedAt: readyAt,
    });
    created.push({ code, status: entry.status, technician: entry.technician });
  }
  const byStatus = created.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  ✓ ${created.length} tickets`);
  console.log(
    `    ${Object.entries(byStatus)
      .map(([status, count]) => `${status}=${count}`)
      .join('  ')}`
  );
}

async function seedInventory(branches: Map<string, mongoose.Types.ObjectId>): Promise<void> {
  heading('Inventory');
  await InventoryTransaction.deleteMany({});
  await InventoryItem.deleteMany({});
  let txnCount = 0;
  for (const entry of INVENTORY_ITEMS) {
    const branchId = branches.get(entry.branchCode);
    if (!branchId) {
      console.warn(`  ! skipped: branch "${entry.branchCode}" not found`);
      continue;
    }
    const item = await InventoryItem.create({
      name: entry.name,
      category: entry.category,
      brand: entry.brand,
      unit: entry.unit,
      quantityOnHand: entry.quantityOnHand,
      minQuantity: entry.minQuantity,
      unitCost: entry.unitCost,
      sellPrice: entry.sellPrice,
      location: entry.location,
      supplier: entry.supplier,
      branch: branchId,
      sku: generateCode('PRT', 6),
      isActive: true,
    });
    if (entry.quantityOnHand > 0) {
      await InventoryTransaction.create({
        item: item._id,
        branch: branchId,
        type: 'purchase',
        quantity: entry.quantityOnHand,
        unitCost: entry.unitCost,
        balanceAfter: entry.quantityOnHand,
        notes: 'Opening stock (seed)',
        performedByName: 'Seed',
      });
      txnCount += 1;
    }
    const flag =
      entry.quantityOnHand <= 0
        ? 'OUT'
        : entry.quantityOnHand <= entry.minQuantity
          ? 'LOW'
          : 'OK';
    console.log(
      `  ✓ ${item.sku}  ${item.name.slice(0, 36).padEnd(36)} qty=${String(entry.quantityOnHand).padStart(3)}  [${flag}]`
    );
  }
  console.log(`  ${INVENTORY_ITEMS.length} items · ${txnCount} opening movements`);
}

async function seedNotifications(): Promise<void> {
  heading('Notifications');
  await AppNotification.deleteMany({});
  const users = await User.find({}).select('name email');
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const documents = NOTIFICATION_SEED.flatMap((entry) => {
    const recipient = byEmail.get(entry.recipientEmail);
    if (!recipient) return [];
    const created = at(entry.daysAgo, entry.hour, 0);
    return [
      {
        recipient: recipient._id,
        type: entry.type,
        severity: entry.severity,
        titleKey: entry.titleKey,
        bodyKey: entry.bodyKey,
        params: entry.params,
        link: entry.link,
        readAt: entry.read ? new Date(created.getTime() + 3_600_000) : null,
        createdAt: created,
        updatedAt: created,
      },
    ];
  });
  await AppNotification.insertMany(documents);
  const unread = documents.filter((doc) => doc.readAt === null).length;
  console.log(`  ✓ ${documents.length} notifications (${unread} unread)`);
}

async function main(): Promise<void> {
  const started = Date.now();
  console.log('\x1b[36m┌──────────────────────────────────────────────┐');
  console.log('│  RepairFlow — development seed               │');
  console.log('└──────────────────────────────────────────────┘\x1b[0m');
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`\n  connected → ${mongoose.connection.name}`);
  if (isFresh) {
    heading('Resetting RepairFlow collections (--fresh)');
    const ours = [
      'users',
      'branches',
      'activitylogs',
      'appnotifications',
      'customers',
      'devices',
      'repairtickets',
      'counters',
      'inventoryitems',
      'inventorytransactions',
    ];
    for (const name of ours) {
      await mongoose.connection.db!.collection(name).deleteMany({});
      console.log(`  ✓ cleared ${name}`);
    }
  }
  const branches = await seedBranches();
  await seedStaff(branches);
  await seedCustomers(branches);
  await seedRepairs();
  await seedInventory(branches);
  await seedActivity();
  await seedNotifications();
  const userCount = await User.countDocuments();
  const branchCount = await Branch.countDocuments();
  const activityCount = await ActivityLog.countDocuments();
  const customerCount = await Customer.countDocuments();
  const deviceCount = await Device.countDocuments();
  const repairCount = await RepairTicket.countDocuments();
  const inventoryCount = await InventoryItem.countDocuments();
  heading('Done');
  console.log(
    `  ${branchCount} branches | ${userCount} employees | ${customerCount} customers | ` +
      `${deviceCount} devices | ${repairCount} tickets | ${inventoryCount} parts | ${activityCount} activity entries | ` +
      `${Date.now() - started}ms\n`
  );
  console.log('\x1b[36m  Sign in with any address below:\x1b[0m');
  for (const person of STAFF) {
    console.log(`    ${person.email.padEnd(40)} ${SEED_PASSWORD}   (${person.role})`);
  }
  console.log('\n  Console: http://localhost:5173/login\n');
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (error) => {
  console.error('\n\x1b[31mSeed failed:\x1b[0m', error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
