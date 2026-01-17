import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードデータの作成を開始します...');

  // 部門の作成
  const department = await prisma.department.upsert({
    where: { code: 'DEPT001' },
    update: {},
    create: {
      name: '総務部',
      code: 'DEPT001',
      isActive: true,
    },
  });

  console.log('✅ 部門を作成しました:', department.name);

  // 会員の作成
  const member = await prisma.member.upsert({
    where: { memberId: 'member001' },
    update: {},
    create: {
      memberId: 'member001',
      name: 'テスト会員',
      email: 'test@example.com',
      departmentId: department.id,
      role: 'member',
    },
  });

  console.log('✅ 会員を作成しました:', member.name);

  // 事務局の作成
  const admin = await prisma.member.upsert({
    where: { memberId: 'admin001' },
    update: {},
    create: {
      memberId: 'admin001',
      name: 'テスト事務局',
      email: 'admin@example.com',
      departmentId: department.id,
      role: 'admin',
    },
  });

  console.log('✅ 事務局を作成しました:', admin.name);

  // 社内カテゴリの作成
  const categories = [
    { name: '交通費', code: 'CAT001', description: '交通費' },
    { name: '会議費', code: 'CAT002', description: '会議費' },
    { name: '通信費', code: 'CAT003', description: '通信費' },
    { name: '消耗品費', code: 'CAT004', description: '消耗品費' },
    { name: 'その他', code: 'CAT999', description: 'その他' },
  ];

  for (const category of categories) {
    await prisma.internalCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
    console.log(`✅ 社内カテゴリを作成しました: ${category.name}`);
  }

  console.log('🎉 シードデータの作成が完了しました！');
}

main()
  .catch((e) => {
    console.error('❌ シードデータの作成に失敗しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
