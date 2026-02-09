import { PrismaClient, MemberRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

interface DepartmentSeed {
  readonly name: string
  readonly code: string
}

interface CategorySeed {
  readonly name: string
  readonly code: string
}

interface MemberSeed {
  readonly memberId: string
  readonly name: string
  readonly email: string
  readonly password: string
  readonly role: MemberRole
  readonly departmentCode: string
}

const departments: readonly DepartmentSeed[] = [
  { name: '総務部', code: 'GEN' },
  { name: '営業部', code: 'SALES' },
  { name: '企画部', code: 'PLAN' },
] as const

const categories: readonly CategorySeed[] = [
  { name: '交通費', code: 'TRANSPORT' },
  { name: '会議費', code: 'MEETING' },
  { name: '消耗品費', code: 'SUPPLIES' },
  { name: '通信費', code: 'COMM' },
  { name: 'その他', code: 'OTHER' },
] as const

const members: readonly MemberSeed[] = [
  {
    memberId: 'SPC-0001',
    name: '管理者太郎',
    email: 'admin@spc.example.com',
    password: 'admin123',
    role: MemberRole.ADMIN,
    departmentCode: 'GEN',
  },
  {
    memberId: 'SPC-0002',
    name: '会員花子',
    email: 'member@spc.example.com',
    password: 'member123',
    role: MemberRole.MEMBER,
    departmentCode: 'SALES',
  },
] as const

async function seedDepartments(): Promise<Map<string, string>> {
  const departmentMap = new Map<string, string>()

  for (const dept of departments) {
    const result = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: { name: dept.name, code: dept.code },
    })
    departmentMap.set(result.code, result.id)
  }

  return departmentMap
}

async function seedCategories(): Promise<void> {
  for (const category of categories) {
    await prisma.internalCategory.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: { name: category.name, code: category.code },
    })
  }
}

async function seedMembers(departmentMap: Map<string, string>): Promise<void> {
  for (const member of members) {
    const departmentId = departmentMap.get(member.departmentCode)
    if (!departmentId) {
      throw new Error(`Department not found for code: ${member.departmentCode}`)
    }

    const passwordHash = await bcrypt.hash(member.password, SALT_ROUNDS)

    await prisma.member.upsert({
      where: { email: member.email },
      update: {
        name: member.name,
        memberId: member.memberId,
        role: member.role,
        departmentId,
      },
      create: {
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        passwordHash,
        departmentId,
        role: member.role,
      },
    })
  }
}

async function main(): Promise<void> {
  console.info('Seeding database...')

  const departmentMap = await seedDepartments()
  console.info(`Seeded ${departments.length} departments`)

  await seedCategories()
  console.info(`Seeded ${categories.length} internal categories`)

  await seedMembers(departmentMap)
  console.info(`Seeded ${members.length} members`)

  console.info('Seeding complete.')
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
