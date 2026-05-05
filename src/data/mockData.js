export const employees = [
  { id: "RWT001", name: "Arjun Sharma", role: "Frontend Developer", department: "Engineering", email: "arjun@royalswebtech.com", phone: "+91 98765 43210", joinDate: "2023-01-15", status: "Present", salary: 65000 },
  { id: "RWT002", name: "Priya Mehta", role: "UI/UX Designer", department: "Design", email: "priya@royalswebtech.com", phone: "+91 98765 43211", joinDate: "2023-03-22", status: "Present", salary: 60000 },
  { id: "RWT003", name: "Rahul Verma", role: "Backend Developer", department: "Engineering", email: "rahul@royalswebtech.com", phone: "+91 98765 43212", joinDate: "2022-11-10", status: "Absent", salary: 70000 },
  { id: "RWT004", name: "Sneha Patil", role: "Project Manager", department: "Management", email: "sneha@royalswebtech.com", phone: "+91 98765 43213", joinDate: "2022-06-01", status: "Leave", salary: 80000 },
  { id: "RWT005", name: "Vikram Singh", role: "DevOps Engineer", department: "Engineering", email: "vikram@royalswebtech.com", phone: "+91 98765 43214", joinDate: "2023-07-18", status: "Present", salary: 75000 },
  { id: "RWT006", name: "Neha Joshi", role: "React Developer", department: "Engineering", email: "neha@royalswebtech.com", phone: "+91 98765 43215", joinDate: "2023-09-05", status: "WFH", salary: 62000 },
  { id: "RWT007", name: "Amit Kulkarni", role: "Node.js Developer", department: "Engineering", email: "amit@royalswebtech.com", phone: "+91 98765 43216", joinDate: "2022-04-12", status: "Present", salary: 68000 },
  { id: "RWT008", name: "Kavya Reddy", role: "QA Engineer", department: "QA", email: "kavya@royalswebtech.com", phone: "+91 98765 43217", joinDate: "2023-02-28", status: "Present", salary: 55000 },
  { id: "RWT009", name: "Rohan Desai", role: "Mobile Developer", department: "Engineering", email: "rohan@royalswebtech.com", phone: "+91 98765 43218", joinDate: "2022-08-14", status: "Absent", salary: 72000 },
  { id: "RWT010", name: "Pooja Nair", role: "HR Manager", department: "HR", email: "pooja@royalswebtech.com", phone: "+91 98765 43219", joinDate: "2021-12-01", status: "Present", salary: 78000 },
  { id: "RWT011", name: "Suresh Iyer", role: "SEO Specialist", department: "Marketing", email: "suresh@royalswebtech.com", phone: "+91 98765 43220", joinDate: "2023-05-10", status: "Present", salary: 50000 },
  { id: "RWT012", name: "Ananya Bose", role: "Content Writer", department: "Marketing", email: "ananya@royalswebtech.com", phone: "+91 98765 43221", joinDate: "2023-11-20", status: "Leave", salary: 45000 },
];

export const departments = [
  { id: 1, name: "Engineering", headcount: 7, openRoles: 2, hod: "Rahul Verma", color: "#00B8B8" },
  { id: 2, name: "Design", headcount: 2, openRoles: 1, hod: "Priya Mehta", color: "#CC0000" },
  { id: 3, name: "Management", headcount: 1, openRoles: 0, hod: "Sneha Patil", color: "#C9922A" },
  { id: 4, name: "QA", headcount: 1, openRoles: 1, hod: "Kavya Reddy", color: "#00B8B8" },
  { id: 5, name: "HR", headcount: 1, openRoles: 0, hod: "Pooja Nair", color: "#CC0000" },
  { id: 6, name: "Marketing", headcount: 2, openRoles: 1, hod: "Suresh Iyer", color: "#C9922A" },
];

export const weeklyAttendance = [
  { day: "Mon", present: 10, absent: 2 },
  { day: "Tue", present: 11, absent: 1 },
  { day: "Wed", present: 9, absent: 3 },
  { day: "Thu", present: 12, absent: 0 },
  { day: "Fri", present: 8, absent: 4 },
  { day: "Sat", present: 6, absent: 6 },
];

export const leaveRequests = [
  { id: 1, employee: "Sneha Patil", type: "Annual Leave", from: "2026-05-05", to: "2026-05-07", days: 3, reason: "Family function", status: "Pending" },
  { id: 2, employee: "Ananya Bose", type: "Sick Leave", from: "2026-05-05", to: "2026-05-06", days: 2, reason: "Fever", status: "Pending" },
  { id: 3, employee: "Rohan Desai", type: "Casual Leave", from: "2026-05-08", to: "2026-05-08", days: 1, reason: "Personal work", status: "Pending" },
];

export const payrollData = [
  { id: "RWT001", name: "Arjun Sharma", basic: 32500, hra: 13000, allowance: 6500, deductions: 4500, net: 47500 },
  { id: "RWT002", name: "Priya Mehta", basic: 30000, hra: 12000, allowance: 6000, deductions: 4000, net: 44000 },
  { id: "RWT003", name: "Rahul Verma", basic: 35000, hra: 14000, allowance: 7000, deductions: 5000, net: 51000 },
  { id: "RWT004", name: "Sneha Patil", basic: 40000, hra: 16000, allowance: 8000, deductions: 6000, net: 58000 },
  { id: "RWT005", name: "Vikram Singh", basic: 37500, hra: 15000, allowance: 7500, deductions: 5500, net: 54500 },
];

export const recentJoinings = [
  { id: "RWT012", name: "Ananya Bose", role: "Content Writer", department: "Marketing", joinDate: "2023-11-20" },
  { id: "RWT011", name: "Suresh Iyer", role: "SEO Specialist", department: "Marketing", joinDate: "2023-05-10" },
  { id: "RWT006", name: "Neha Joshi", role: "React Developer", department: "Engineering", joinDate: "2023-09-05" },
  { id: "RWT005", name: "Vikram Singh", role: "DevOps Engineer", department: "Engineering", joinDate: "2023-07-18" },
];