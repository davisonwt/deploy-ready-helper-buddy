import { RadioSlotApprovalInterface } from "../components/radio/RadioSlotApprovalInterface";
import AdminRadioManagement from "../components/radio/AdminRadioManagement";
import { RadioScheduleGrid } from "../components/radio/RadioScheduleGrid";
import PersonnelSlotAssignment from "../components/radio/PersonnelSlotAssignment";

export function AdminRadioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AOD Station Radio Management
          </h1>
          <p className="text-muted-foreground mt-2">Manage schedules, personnel, and show approvals</p>
        </div>
        
        {/* Today's Schedule - Full Width at Top */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Today's Schedule
            </h2>
            <RadioScheduleGrid compact showLegend={false} />
          </div>
        </div>

        {/* Personnel Assignments */}
        <PersonnelSlotAssignment />
        
        {/* Slot Approval Interface and Radio Station Management - Side by Side */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 md:p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Slot Approval Interface
              </h2>
              <RadioSlotApprovalInterface />
            </div>
          </div>
          
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 md:p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Radio Station Management
              </h2>
              <AdminRadioManagement />
            </div>
          </div>
        </div>

        {/* Radio Schedule Slots - Below the Above Two Sections */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Radio Schedule Slots
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-lg border-2 border-dashed border-primary/20 p-8 flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="font-semibold text-lg">Schedule Placeholder 1</h3>
                  <p className="text-sm text-muted-foreground">Ready for content</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg border-2 border-dashed border-primary/20 p-8 flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="text-2xl">🎙️</span>
                  </div>
                  <h3 className="font-semibold text-lg">Schedule Placeholder 2</h3>
                  <p className="text-sm text-muted-foreground">Ready for content</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}