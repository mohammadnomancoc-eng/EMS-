// ─────────────────────────────────────────────────────────────
//  src/firebase/seed.js
//  Run this ONCE from a dev component or a standalone script
//  to push the mock data into Firestore.
//
//  Usage inside a temp React component:
//    import { seedDatabase } from "../firebase/seed";
//    useEffect(() => { seedDatabase(); }, []);
// ─────────────────────────────────────────────────────────────
import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";

const employees = [
  { id: "RWT001", name: "Arjun Sharma",   role: "Frontend Developer", department: "Engineering", email: "arjun@royalswebtech.com",  phone: "+91 98765 43210", joinDate: "2023-01-15", status: "Present", salary: 65000 },
  { id: "RWT002", name: "Priya Mehta",    role: "UI/UX Designer",      department: "Design",      email: "priya@royalswebtech.com",  phone: "+91 98765 43211", joinDate: "2023-03-22", status: "Present", salary: 60000 },
  { id: "RWT003", name: "Rahul Verma",    role: "Backend Developer",   department: "Engineering", email: "rahul@royalswebtech.com",  phone: "+91 98765 43212", joinDate: "2022-11-10", status: "Absent",  salary: 70000 },
  { id: "RWT004", name: "Sneha Patil",    role: "Project Manager",     department: "Management",  email: "sneha@royalswebtech.com",  phone: "+91 98765 43213", joinDate: "2022-06-01", status: "Leave",   salary: 80000 },
  { id: "RWT005", name: "Vikram Singh",   role: "DevOps Engineer",     department: "Engineering", email: "vikram@royalswebtech.com", phone: "+91 98765 43214", joinDate: "2023-07-18", status: "Present", salary: 75000 },
  { id: "RWT006", name: "Neha Joshi",     role: "React Developer",     department: "Engineering", email: "neha@royalswebtech.com",   phone: "+91 98765 43215", joinDate: "2023-09-05", status: "WFH",     salary: 62000 },
  { id: "RWT007", name: "Amit Kulkarni",  role: "Node.js Developer",   department: "Engineering", email: "amit@royalswebtech.com",   phone: "+91 98765 43216", joinDate: "2022-04-12", status: "Present", salary: 68000 },
  { id: "RWT008", name: "Kavya Reddy",    role: "QA Engineer",         department: "QA",          email: "kavya@royalswebtech.com",  phone: "+91 98765 43217", joinDate: "2023-02-28", status: "Present", salary: 55000 },
  { id: "RWT009", name: "Rohan Desai",    role: "Mobile Developer",    department: "Engineering", email: "rohan@royalswebtech.com",  phone: "+91 98765 43218", joinDate: "2022-08-14", status: "Absent",  salary: 72000 },
  { id: "RWT010", name: "Pooja Nair",     role: "HR Manager",          department: "HR",          email: "pooja@royalswebtech.com",  phone: "+91 98765 43219", joinDate: "2021-12-01", status: "Present", salary: 78000 },
  { id: "RWT011", name: "Suresh Iyer",    role: "SEO Specialist",      department: "Marketing",   email: "suresh@royalswebtech.com", phone: "+91 98765 43220", joinDate: "2023-05-10", status: "Present", salary: 50000 },
  { id: "RWT012", name: "Ananya Bose",    role: "Content Writer",      department: "Marketing",   email: "ananya@royalswebtech.com", phone: "+91 98765 43221", joinDate: "2023-11-20", status: "Leave",   salary: 45000 },
];

const departments = [
  { id: "1", name: "Engineering", headcount: 7, openRoles: 2, hod: "Rahul Verma",  color: "#00B8B8" },
  { id: "2", name: "Design",      headcount: 2, openRoles: 1, hod: "Priya Mehta",  color: "#CC0000" },
  { id: "3", name: "Management",  headcount: 1, openRoles: 0, hod: "Sneha Patil",  color: "#C9922A" },
  { id: "4", name: "QA",          headcount: 1, openRoles: 1, hod: "Kavya Reddy",  color: "#00B8B8" },
  { id: "5", name: "HR",          headcount: 1, openRoles: 0, hod: "Pooja Nair",   color: "#CC0000" },
  { id: "6", name: "Marketing",   headcount: 2, openRoles: 1, hod: "Suresh Iyer",  color: "#C9922A" },
];

const leaveRequests = [
  { id: "1",  empId: "RWT004", employee: "Sneha Patil",   type: "Annual Leave", from: "2026-05-05", to: "2026-05-07", days: 3, reason: "Family function",      status: "Pending"  },
  { id: "2",  empId: "RWT012", employee: "Ananya Bose",   type: "Sick Leave",   from: "2026-05-05", to: "2026-05-06", days: 2, reason: "Fever",                status: "Pending"  },
  { id: "3",  empId: "RWT009", employee: "Rohan Desai",   type: "Casual Leave", from: "2026-05-08", to: "2026-05-08", days: 1, reason: "Personal work",        status: "Pending"  },
  { id: "4",  empId: "RWT001", employee: "Arjun Sharma",  type: "Annual Leave", from: "2026-04-15", to: "2026-04-17", days: 3, reason: "Vacation",             status: "Approved" },
  { id: "5",  empId: "RWT002", employee: "Priya Mehta",   type: "Sick Leave",   from: "2026-04-20", to: "2026-04-20", days: 1, reason: "Doctor appointment",   status: "Approved" },
  { id: "6",  empId: "RWT005", employee: "Vikram Singh",  type: "Casual Leave", from: "2026-04-22", to: "2026-04-22", days: 1, reason: "Personal errand",      status: "Rejected" },
  { id: "7",  empId: "RWT006", employee: "Neha Joshi",    type: "WFH",          from: "2026-05-03", to: "2026-05-04", days: 2, reason: "ISP maintenance",      status: "Approved" },
  { id: "8",  empId: "RWT007", employee: "Amit Kulkarni", type: "Annual Leave", from: "2026-05-12", to: "2026-05-14", days: 3, reason: "Religious holiday",    status: "Pending"  },
  { id: "9",  empId: "RWT008", employee: "Kavya Reddy",   type: "Sick Leave",   from: "2026-04-28", to: "2026-04-29", days: 2, reason: "Medical treatment",    status: "Approved" },
  { id: "10", empId: "RWT010", employee: "Pooja Nair",    type: "Casual Leave", from: "2026-05-02", to: "2026-05-02", days: 1, reason: "Child school function",status: "Approved" },
  { id: "11", empId: "RWT003", employee: "Rahul Verma",   type: "WFH",          from: "2026-05-06", to: "2026-05-06", days: 1, reason: "Working from home",    status: "Pending"  },
  { id: "12", empId: "RWT011", employee: "Suresh Iyer",   type: "Annual Leave", from: "2026-05-19", to: "2026-05-21", days: 3, reason: "Family trip",          status: "Pending"  },
];

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding Firestore...");

    // Employees
    const empBatch = writeBatch(db);
    employees.forEach((emp) => {
      const ref = doc(collection(db, "employees"), emp.id);
      empBatch.set(ref, emp);
    });
    await empBatch.commit();
    console.log("✅ Employees seeded");

    // Departments
    const deptBatch = writeBatch(db);
    departments.forEach((dept) => {
      const ref = doc(collection(db, "departments"), dept.id);
      deptBatch.set(ref, dept);
    });
    await deptBatch.commit();
    console.log("✅ Departments seeded");

    // Leave Requests
    const leaveBatch = writeBatch(db);
    leaveRequests.forEach((req) => {
      const ref = doc(collection(db, "leaveRequests"), req.id);
      leaveBatch.set(ref, req);
    });
    await leaveBatch.commit();
    console.log("✅ Leave requests seeded");

    console.log("🎉 Database seeded successfully!");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  }
}
