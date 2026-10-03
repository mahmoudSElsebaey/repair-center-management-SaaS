import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { BRANCHES, STAFF } from './data/staff.js';
import { CUSTOMERS } from './data/customers.js';
import { SEED_PASSWORD } from './manifest.js';

/**
 * RepairFlow development seed.
 *
 * Idempotent: running it repeatedly converges the demo tenant instead of
 * duplicating it. It never drops collections, so local data survives a re-seed.
 *
 *   npm run seed              seed everything
 *   npm run seed -- --fresh   wipe RepairFlow collections first
 */

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
      // Keep the account aligned with the manifest without resetting a password
      // the developer may have changed locally.
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

async function main(): Promise<void> {
  const started = Date.now();

  console.log('\x1b[36m╭──────────────────────────────────────────────╮');
  console.log('│  RepairFlow — development seed               │');
  console.log('╰──────────────────────────────────────────────╯\x1b[0m');

  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`\n  connected → ${mongoose.connection.name}`);

  if (isFresh) {
    heading('Resetting RepairFlow collections (--fresh)');
    const collections = await mongoose.connection.db!.listCollections().toArray();
    const ours = collections
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.') && ['users', 'branches'].includes(name));

    for (const name of ours) {
      await mongoose.connection.db!.collection(name).deleteMany({});
      console.log(`  ✓ cleared ${name}`);
    }
  }

  const branches = await seedBranches();
  await seedStaff(branches);

  heading('Customers');
  console.log(
    `  ○ ${CUSTOMERS.length} customer profiles are staged in src/seed/data/customers.ts`
  );
  console.log('    They are persisted in Phase 03 together with their devices.');

  const userCount = await User.countDocuments();
  const branchCount = await Branch.countDocuments();

  heading('Done');
  console.log(`  ${branchCount} branches · ${userCount} employees · ${Date.now() - started}ms\n`);

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
