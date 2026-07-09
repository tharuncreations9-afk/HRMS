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
  { departmentName: "Admin Staff", departmentCode: "ADM" },
  { departmentName: "Factory Staff", departmentCode: "FAC" },
  { departmentName: "Support Staff", departmentCode: "SUP" },
  { departmentName: "Job Workers", departmentCode: "JOB" },
  { departmentName: "Temporary Staff", departmentCode: "TMP" },
  { departmentName: "Management", departmentCode: "MGT" },
];

/** departmentCode, designationName, designationCode, sequenceStart */
const DESIGNATIONS = [
  { dept: "ADM", name: "Accounts", code: "AC", sequenceStart: 1001 },
  { dept: "ADM", name: "Technical/IT", code: "IT", sequenceStart: 2001 },
  { dept: "ADM", name: "Tagging", code: "TG", sequenceStart: 3001 },
  { dept: "ADM", name: "Marketing", code: "MK", sequenceStart: 4001 },
  { dept: "ADM", name: "Stone", code: "SN", sequenceStart: 5001 },
  { dept: "ADM", name: "Bandini", code: "BD", sequenceStart: 6001 },
  { dept: "FAC", name: "Factory General", code: "FG", sequenceStart: 7001 },
  { dept: "FAC", name: "Designer", code: "DS", sequenceStart: 8001 },
  { dept: "FAC", name: "Assorter", code: "AS", sequenceStart: 9001 },
  { dept: "FAC", name: "Ghat", code: "GH", sequenceStart: 10001 },
  { dept: "FAC", name: "Setting", code: "ST", sequenceStart: 11001 },
  { dept: "FAC", name: "Wax", code: "WX", sequenceStart: 12001 },
  { dept: "FAC", name: "Casting", code: "CS", sequenceStart: 13001 },
  { dept: "FAC", name: "Polish", code: "PL", sequenceStart: 14001 },
  { dept: "SUP", name: "House Keeping", code: "HK", sequenceStart: 15001 },
  { dept: "SUP", name: "Security", code: "SC", sequenceStart: 16001 },
  { dept: "SUP", name: "Drivers", code: "DR", sequenceStart: 17001 },
  { dept: "JOB", name: "Dank", code: "DK", sequenceStart: 18001 },
  { dept: "TMP", name: "Temporary Karigars", code: "TK", sequenceStart: 19001 },
  { dept: "MGT", name: "Director, Partner", code: "M", sequenceStart: 1 },
];



const LEAVE_TYPES = [

  { leaveName: "Casual Leave", yearlyLimit: 12 },

  { leaveName: "Sick Leave", yearlyLimit: 10 },

  { leaveName: "Earned Leave", yearlyLimit: 15 },

  { leaveName: "Optional Holiday", yearlyLimit: 10 },

  { leaveName: "Comp Off", yearlyLimit: 3 },

];



const TEST_EMPLOYEES = [
  {
    code: "VLJ-M-001",
    role: "super_admin",
    firstName: "Rajesh",
    lastName: "Kumar",
    email: "superadmin@vlj.com",
    dept: "MGT",
    desig: "Director, Partner",
  },
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

  for (const d of DESIGNATIONS) {
    const key = `${d.dept}:${d.name}`;
    const isSuperadminDesig = d.code === "M";
    desigRecords[key] = await prisma.designation.upsert({
      where: { designationCode: d.code },
      update: {
        designationName: d.name,
        departmentId: deptRecords[d.dept].id,
        sequenceStart: d.sequenceStart,
      },
      create: {
        designationName: d.name,
        designationCode: d.code,
        departmentId: deptRecords[d.dept].id,
        sequenceStart: d.sequenceStart,
        lastSequence: isSuperadminDesig ? 1 : null,
        releasedSequences: [],
      },
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

        departmentId: deptRecords[u.dept].id,

        designationId: desigRecords[`${u.dept}:${u.desig}`].id,

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

