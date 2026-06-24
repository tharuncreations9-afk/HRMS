/**

 * VLJ HRMS — Seed: Roles, Permissions, Employees (single-table auth)

 */



const { createPrismaClient } = require("./db");
const bcrypt = require("bcryptjs");

const prisma = createPrismaClient();

const DEFAULT_PASSWORD = "Admin@123";



const ROLES = ["employee", "manager", "hr", "admin", "security", "super_admin"];



const PERMISSIONS = [

  { permissionName: "View Profile", moduleName: "Employee Self-Service" },

  { permissionName: "Edit Profile", moduleName: "Employee Self-Service" },

  { permissionName: "View Attendance", moduleName: "Employee Self-Service" },

  { permissionName: "Mark Attendance", moduleName: "Security" },

  { permissionName: "Apply Leave", moduleName: "Employee Self-Service" },

  { permissionName: "View Leave Status", moduleName: "Employee Self-Service" },

  { permissionName: "View Team Attendance", moduleName: "Manager" },

  { permissionName: "View Team Reports", moduleName: "Manager" },

  { permissionName: "View Team Leave Requests", moduleName: "Manager" },

  { permissionName: "Employee Management", moduleName: "HR" },

  { permissionName: "Attendance Corrections", moduleName: "HR" },

  { permissionName: "Generate Reports", moduleName: "HR" },

  { permissionName: "View Leave Requests", moduleName: "HR" },

  { permissionName: "Final Leave Approval", moduleName: "HR" },

  { permissionName: "User Management", moduleName: "Admin" },

  { permissionName: "Department Management", moduleName: "Admin" },

  { permissionName: "Shift Management", moduleName: "Admin" },

  { permissionName: "Leave Approval", moduleName: "Admin" },

  { permissionName: "Role Management", moduleName: "Admin" },

  { permissionName: "Attendance Monitoring", moduleName: "Admin" },

  { permissionName: "Full System Access", moduleName: "System" },

  { permissionName: "All Permissions", moduleName: "System" },

  { permissionName: "Audit Logs", moduleName: "System" },

  { permissionName: "Permission Control", moduleName: "System" },

  { permissionName: "Approve Any Leave", moduleName: "System" },

];



const ROLE_PERMISSION_MAP = {

  employee: ["View Profile", "Edit Profile", "View Attendance", "Apply Leave", "View Leave Status"],

  manager: ["View Profile", "Edit Profile", "View Attendance", "Apply Leave", "View Leave Status", "View Team Attendance", "View Team Reports", "View Team Leave Requests"],

  hr: ["View Profile", "Apply Leave", "View Leave Status", "Employee Management", "Attendance Corrections", "Generate Reports", "View Leave Requests", "Final Leave Approval", "Attendance Monitoring", "Shift Management"],

  admin: ["View Profile", "User Management", "Department Management", "Shift Management", "Leave Approval", "Role Management", "Attendance Monitoring", "View Attendance", "Apply Leave", "Generate Reports"],

  security: ["View Profile", "View Attendance", "Mark Attendance"],

  super_admin: PERMISSIONS.map((p) => p.permissionName).filter((p) => p !== "Apply Leave"),

};



const DEPARTMENTS = [

  { departmentName: "Human Resources", departmentCode: "HR" },

  { departmentName: "Engineering", departmentCode: "ENG" },

  { departmentName: "Finance", departmentCode: "FIN" },

  { departmentName: "Sales", departmentCode: "SAL" },

  { departmentName: "Marketing", departmentCode: "MKT" },

  { departmentName: "Operations", departmentCode: "OPS" },

];



const DESIGNATIONS = [

  "Software Engineer", "Senior Engineer", "Team Lead", "Manager",

  "HR Executive", "HR Manager", "Accountant", "Director", "VP",

];



const LEAVE_TYPES = [

  { leaveName: "Casual Leave", yearlyLimit: 12 },

  { leaveName: "Sick Leave", yearlyLimit: 10 },

  { leaveName: "Earned Leave", yearlyLimit: 15 },

  { leaveName: "Optional Holiday", yearlyLimit: 10 },

  { leaveName: "Comp Off", yearlyLimit: 3 },

];



const TEST_EMPLOYEES = [

  { code: "EMP001", role: "super_admin", firstName: "Rajesh", lastName: "Kumar", email: "superadmin@vlj.com", dept: "HR", desig: "Director" },

  { code: "EMP002", role: "admin", firstName: "Priya", lastName: "Sharma", email: "admin@vlj.com", dept: "HR", desig: "Manager" },

  { code: "EMP003", role: "hr", firstName: "Amit", lastName: "Patel", email: "hr@vlj.com", dept: "HR", desig: "HR Manager" },

  { code: "EMP004", role: "manager", firstName: "Sneha", lastName: "Reddy", email: "manager@vlj.com", dept: "ENG", desig: "Team Lead" },

  { code: "EMP005", role: "employee", firstName: "Vikram", lastName: "Singh", email: "employee@vlj.com", dept: "ENG", desig: "Software Engineer" },

  { code: "EMP006", role: "security", firstName: "Ravi", lastName: "Naidu", email: "security@vlj.com", dept: "OPS", desig: "HR Executive" },

];



async function main() {

  console.log("🌱 Seeding VLJ HRMS...\n");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);



  const roleRecords = {};

  for (const roleName of ROLES) {

    roleRecords[roleName] = await prisma.role.upsert({

      where: { roleName },

      update: {},

      create: { roleName },

    });

    console.log(`  ✓ Role: ${roleName}`);

  }



  const permRecords = {};

  for (const perm of PERMISSIONS) {

    permRecords[perm.permissionName] = await prisma.permission.upsert({

      where: { permissionName_moduleName: { permissionName: perm.permissionName, moduleName: perm.moduleName } },

      update: {},

      create: perm,

    });

  }

  console.log(`  ✓ Permissions: ${PERMISSIONS.length}`);



  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAP)) {

    for (const permName of permNames) {

      const perm = permRecords[permName];

      if (!perm) continue;

      await prisma.rolePermission.upsert({

        where: { roleId_permissionId: { roleId: roleRecords[roleName].id, permissionId: perm.id } },

        update: {},

        create: { roleId: roleRecords[roleName].id, permissionId: perm.id },

      });

    }

  }

  console.log("  ✓ Role permissions assigned");



  const deptRecords = {};

  for (const dept of DEPARTMENTS) {

    deptRecords[dept.departmentCode] = await prisma.department.upsert({

      where: { departmentCode: dept.departmentCode },

      update: {},

      create: dept,

    });

  }

  console.log(`  ✓ Departments: ${DEPARTMENTS.length}`);



  const desigRecords = {};

  for (const name of DESIGNATIONS) {

    desigRecords[name] = await prisma.designation.upsert({

      where: { designationName: name },

      update: {},

      create: { designationName: name },

    });

  }

  console.log(`  ✓ Designations: ${DESIGNATIONS.length}`);



  const leaveRecords = {};

  for (const lt of LEAVE_TYPES) {

    leaveRecords[lt.leaveName] = await prisma.leaveType.upsert({

      where: { leaveName: lt.leaveName },

      update: {},

      create: lt,

    });

  }

  console.log(`  ✓ Leave types: ${LEAVE_TYPES.length}`);



  let managerEmployeeId = null;

  for (const u of TEST_EMPLOYEES) {

    const employee = await prisma.employee.upsert({

      where: { employeeCode: u.code },

      update: {

        passwordHash,

        roleId: roleRecords[u.role].id,

        email: u.email,

        camAttendanceId: u.code,

      },

      create: {

        employeeCode: u.code,

        camAttendanceId: u.code,

        firstName: u.firstName,

        lastName: u.lastName,

        fullName: `${u.firstName} ${u.lastName}`,


        mobile: `9876543${u.code.slice(-3)}`,

        email: u.email,

        passwordHash,

        roleId: roleRecords[u.role].id,

        address: "Bangalore, Karnataka",

        departmentId: deptRecords[u.dept === "HR" ? "HR" : u.dept === "ENG" ? "ENG" : u.dept === "OPS" ? "OPS" : "HR"].id,

        designationId: desigRecords[u.desig].id,

        reportingManagerId: u.role === "employee" ? managerEmployeeId : null,

        joiningDate: new Date("2020-01-15"),

        employmentType: "Full_Time",

        status: "Active",

      },

    });



    if (u.role === "manager") managerEmployeeId = employee.id;



    const year = new Date().getFullYear();

    for (const lt of Object.values(leaveRecords)) {

      await prisma.leaveBalance.upsert({

        where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: lt.id, year } },

        update: {},

        create: {

          employeeId: employee.id,

          leaveTypeId: lt.id,

          totalLeave: lt.yearlyLimit,

          usedLeave: 0,

          remainingLeave: lt.yearlyLimit,

          year,

        },

      });

    }



    console.log(`  ✓ Employee: ${u.code} (${u.role}) — ${u.firstName} ${u.lastName}`);

  }



  const holidays = [

    { holidayName: "Republic Day", holidayDate: new Date("2026-01-26") },

    { holidayName: "Independence Day", holidayDate: new Date("2026-08-15") },

  ];

  for (const h of holidays) {

    await prisma.holiday.upsert({

      where: { holidayDate: h.holidayDate },

      update: {},

      create: h,

    });

  }



  await prisma.$executeRawUnsafe("UPDATE employees SET cam_attendance_id = employee_code");
  await prisma.$executeRawUnsafe(
    "UPDATE attendance a INNER JOIN employees e ON a.employee_id = e.id SET a.cam_attendance_id = e.employee_code, a.employee_code = e.employee_code"
  );

  const { seedAttendanceStatuses } = require("./seed-attendance-statuses");
  await seedAttendanceStatuses(prisma);

  console.log("\n✅ Seed complete!");

  console.log("\n📋 Login with Email + Password (Admin@123):");

  console.log("   superadmin@vlj.com  — Super Admin");

  console.log("   admin@vlj.com       — Admin");

  console.log("   hr@vlj.com          — HR");

  console.log("   manager@vlj.com     — Manager");

  console.log("   employee@vlj.com    — Employee");

  console.log("   security@vlj.com    — Security (marks attendance)\n");

}



main()

  .catch((e) => { console.error(e); process.exit(1); })

  .finally(() => prisma.$disconnect());

