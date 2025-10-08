import { RadioSlotApprovalInterface } from "../components/radio/RadioSlotApprovalInterface";
import AdminRadioManagement from "../components/radio/AdminRadioManagement";
import { RadioScheduleGrid } from "../components/radio/RadioScheduleGrid";
import PersonnelSlotAssignment from "../components/radio/PersonnelSlotAssignment";

export function AdminRadioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6">AOD Station Radio Management</h1>
        
        {/* Top row - Today's Schedule and Personnel Assignments side by side */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border p-4 md:p-6 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">Today's Schedule</h2>
            <RadioScheduleGrid />
          </div>
          
          <div className="bg-card rounded-lg border p-4 md:p-6 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">Personnel Assignments</h2>
            <div className="overflow-x-auto">
              <PersonnelSlotAssignment />
            </div>
          </div>
        </div>
        
        {/* Bottom row - Other admin components */}
        <div className="grid gap-6">
          <div className="bg-card rounded-lg border p-4 md:p-6 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">Slot Approval Interface</h2>
            <RadioSlotApprovalInterface />
          </div>
          
          <div className="bg-card rounded-lg border p-4 md:p-6 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">Show Approvals</h2>
            <div className="overflow-x-auto">
              <AdminRadioManagement />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}