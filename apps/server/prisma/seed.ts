/**
 * Development seed: three titans, a direct thread and a war room.
 * Password for every seeded account: voidlink-dev
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const PASSWORD = 'voidlink-dev';

const PEOPLE = [
  { username: 'ashka', displayName: 'Ashka Vorn', email: 'ashka@voidlink.test' },
  { username: 'rune', displayName: 'Rune Kael', email: 'rune@voidlink.test' },
  { username: 'sable', displayName: 'Sable Orr', email: 'sable@voidlink.test' },
];

async function main() {
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const users: Record<string, string> = {};

  for (const person of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { username: person.username },
      update: { displayName: person.displayName },
      create: {
        ...person,
        passwordHash,
        emailVerifiedAt: new Date(),
        presence: 'OFFLINE',
        settings: { create: {} },
      },
      select: { id: true, username: true },
    });
    users[user.username] = user.id;
  }

  const ashka = users.ashka!;
  const rune = users.rune!;
  const sable = users.sable!;

  let direct = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [{ participants: { some: { userId: ashka } } }, { participants: { some: { userId: rune } } }],
    },
    select: { id: true },
  });

  if (!direct) {
    direct = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        createdById: ashka,
        memberCount: 2,
        participants: { create: [{ userId: ashka, role: 'OWNER' }, { userId: rune }] },
      },
      select: { id: true },
    });

    const script = [
      { from: rune, body: 'The eastern gate is sealed. We hold until the ember tide turns.', offset: 6 },
      { from: ashka, body: 'Then we do not fall. I am bringing the sixth gem.', offset: 5 },
      { from: rune, body: 'The monolith answers when all six are socketed.', offset: 4 },
      { from: ashka, body: 'Then light them.', offset: 3 },
      { from: rune, body: 'Received. Two minutes out. Keep the gate burning.', offset: 1 },
    ];

    for (const [index, message] of script.entries()) {
      const createdAt = new Date(Date.now() - message.offset * 60_000);
      const row = await prisma.message.create({
        data: {
          conversationId: direct.id,
          senderId: message.from,
          clientId: `seed-direct-${index}`,
          type: 'TEXT',
          body: message.body,
          createdAt,
          receipts: {
            create: [{ userId: message.from === ashka ? rune : ashka, state: index < 4 ? 'READ' : 'DELIVERED', deliveredAt: createdAt, readAt: index < 4 ? createdAt : null }],
          },
        },
      });
      if (index === script.length - 1) {
        await prisma.conversation.update({
          where: { id: direct.id },
          data: { lastMessageAt: createdAt, lastMessageId: row.id },
        });
      }
    }
  }

  let group = await prisma.conversation.findFirst({
    where: { type: 'GROUP', title: 'The War Room' },
    select: { id: true },
  });

  if (!group) {
    group = await prisma.conversation.create({
      data: {
        type: 'GROUP',
        title: 'The War Room',
        createdById: ashka,
        memberCount: 3,
        participants: {
          create: [
            { userId: ashka, role: 'OWNER' },
            { userId: rune, role: 'ADMIN' },
            { userId: sable, role: 'MEMBER' },
          ],
        },
      },
      select: { id: true },
    });

    await prisma.message.create({
      data: {
        conversationId: group.id,
        senderId: sable,
        clientId: 'seed-group-0',
        type: 'TEXT',
        body: 'All six gems are accounted for. Awaiting the call.',
        receipts: { create: [{ userId: ashka, state: 'DELIVERED' }, { userId: rune, state: 'DELIVERED' }] },
      },
    });
  }

  console.log('Seed complete. Accounts: ashka / rune / sable — password: voidlink-dev');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
