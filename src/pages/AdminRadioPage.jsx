import { RadioSlotApprovalInterface } from "../components/radio/RadioSlotApprovalInterface";
import { AdminRadioManagement } from "../components/radio/AdminRadioManagement";
import { RadioScheduleGrid } from "../components/radio/RadioScheduleGrid";

export function AdminRadioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-8">AOD Station Radio Management</h1>
        
        <div className="grid gap-8">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-2xl font-semibold text-primary mb-4">Radio Schedule</h2>
            <RadioScheduleGrid />
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-2xl font-semibold text-primary mb-4">Slot Approval Interface</h2>
            <RadioSlotApprovalInterface />
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-2xl font-semibold text-primary mb-4">Admin Management</h2>
            <AdminRadioManagement />
          </div>
        </div>
      </div>
    </div>
  );
}