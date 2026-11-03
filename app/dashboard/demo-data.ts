import { saveDashboardData } from "./dashboard-storage";

const today = () => new Date().toISOString().slice(0, 10);

const initialRecords: Record<string, unknown[]> = {
  "fleetora-payment-records": [
    { id: "TX-98420", description: "Booking BK-2048", method: "Mobile money", date: today(), amount: 870, type: "Payment", status: "Paid", booking: "BK-2048" },
    { id: "TX-98419", description: "Rental deposit", method: "Bank transfer", date: today(), amount: 500, type: "Payment", status: "Paid", booking: "" },
    { id: "EX-00384", description: "Vehicle servicing", method: "Cash", date: today(), amount: 840, type: "Expense", status: "Approved", booking: "" },
  ],
  "fleetora-expense-records": [
    { id: "EX-00384", category: "Vehicle servicing", vendor: "AutoCare", date: today(), amount: 840, status: "Approved", method: "Cash", notes: "" },
    { id: "EX-00383", category: "Branch utilities", vendor: "Operations", date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), amount: 460, status: "Paid", method: "Bank transfer", notes: "" },
    { id: "EX-00382", category: "GPS subscriptions", vendor: "Technology", date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), amount: 1280, status: "Pending", method: "Mobile money", notes: "" },
  ],
  "fleetora-inspection-records": [
    { id: "IN-2031", booking: "BK-2048", vehicle: "Land Cruiser", type: "Pickup", scheduledAt: `${today()}T09:00`, status: "Pending", mileage: "", fuelLevel: "", notes: "" },
    { id: "IN-2030", booking: "BK-2045", vehicle: "Toyota Hilux", type: "Return", scheduledAt: `${today()}T12:30`, status: "Overdue", mileage: "", fuelLevel: "", notes: "" },
    { id: "IN-2029", booking: "BK-2042", vehicle: "Hyundai Tucson", type: "Return", scheduledAt: `${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}T12:00`, status: "Complete", mileage: "", fuelLevel: "", notes: "" },
  ],
  "fleetora-maintenance-records": [
    { id: "SO-6341", vehicle: "Toyota Hilux", service: "Brake service", provider: "AutoCare", dueDate: today(), estimatedCost: 440, status: "In service", notes: "" },
    { id: "SO-1189", vehicle: "Nissan Patrol", service: "Oil & filters", provider: "FleetFix", dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), estimatedCost: 180, status: "Scheduled", notes: "" },
    { id: "SO-2904", vehicle: "Hyundai Tucson", service: "Insurance renewal", provider: "Internal", dueDate: new Date(Date.now() + 86400000 * 6).toISOString().slice(0, 10), estimatedCost: 620, status: "Pending", notes: "" },
  ],
  "fleetora-contracts": [
    { contract: "CT-10285", booking: "-", customer: "Unassigned", version: "v1", delivery: "Not sent", status: "Review", notaryId: "", createdBy: "Mohamed Ali" },
    { contract: "CT-10284", booking: "BK-2048", customer: "Amina Warsame", version: "v2", delivery: "WhatsApp", status: "Approved", notaryId: "", createdBy: "Mohamed Ali" },
    { contract: "CT-10283", booking: "BK-2047", customer: "Omar Abdi", version: "v1", delivery: "Email", status: "Pending", notaryId: "", createdBy: "Mohamed Ali" },
    { contract: "CT-10282", booking: "BK-2046", customer: "Liam Carter", version: "v3", delivery: "Not sent", status: "Review", notaryId: "", createdBy: "Mohamed Ali" },
  ],
  "fleetora-notary-profiles": [],
  "fleetora-notification-records": [],
  "fleetora-fleet-records": [
    { id: "VH-1001", vehicle: "Toyota Land Cruiser", plate: "AB-1020", type: "SUV", location: "Main branch", status: "Available" },
    { id: "VH-1002", vehicle: "Toyota Hilux", plate: "AB-2045", type: "Pickup", location: "Main branch", status: "Maintenance" },
    { id: "VH-1003", vehicle: "Hyundai Tucson", plate: "AB-3058", type: "SUV", location: "East branch", status: "Available" },
  ],
  "fleetora-booking-records": [
    { id: "BK-2048", customer: "Amina Warsame", vehicle: "Toyota Land Cruiser", startDate: today(), endDate: today(), status: "Active" },
    { id: "BK-2047", customer: "Omar Abdi", vehicle: "Toyota Hilux", startDate: today(), endDate: today(), status: "Confirmed" },
  ],
  "fleetora-customer-records": [
    { id: "CU-1001", name: "Amina Warsame", phone: "+252 61 000 1001", email: "", city: "Mogadishu", status: "Active" },
    { id: "CU-1002", name: "Omar Abdi", phone: "+252 61 000 1002", email: "", city: "Mogadishu", status: "Active" },
  ],
};

export function initializeDashboardDemoData() {
  for (const [key, records] of Object.entries(initialRecords)) {
    if (localStorage.getItem(key) === null) {
      saveDashboardData(key, records);
    }
  }
}
