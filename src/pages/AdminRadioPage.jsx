import { RadioSlotApprovalInterface } from "../components/radio/RadioSlotApprovalInterface";
import AdminRadioManagement from "../components/radio/AdminRadioManagement";
import { RadioScheduleGrid } from "../components/radio/RadioScheduleGrid";
import PersonnelSlotAssignment from "../components/radio/PersonnelSlotAssignment";

export function AdminRadioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-[2000px] mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AOD Station Radio Management
          </h1>
          <p className="text-muted-foreground mt-2">Manage schedules, personnel, and show approvals</p>
        </div>
        
        {/* Today's Schedule - Full Width */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Today's Schedule
            </h2>
            <RadioScheduleGrid compact showLegend={false} />
          </div>
        </div>

        {/* Personnel Assignments - Split inside component */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Personnel Assignments
            </h2>
            <PersonnelSlotAssignment />
          </div>
        </div>
        
        {/* Bottom Section - Full Width Sections */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Slot Approval Interface
              </h2>
              <RadioSlotApprovalInterface />
            </div>
          </div>
          
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Show Approvals
              </h2>
              <AdminRadioManagement />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}