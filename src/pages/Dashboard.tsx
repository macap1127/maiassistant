import { ShoppingCart, CheckSquare, Users, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFamilyData } from "@/lib/store";
import maiLogo from "@/assets/mai-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data } = useFamilyData();

  const pendingGroceries = data.groceryList.filter((g) => !g.completed).length;
  const pendingTasks = data.tasks.filter((t) => !t.completed).length;

  const quickCards = [
    {
      icon: ShoppingCart,
      label: "Grocery List",
      count: pendingGroceries,
      sub: "items needed",
      path: "/grocery",
    },
    {
      icon: CheckSquare,
      label: "Tasks",
      count: pendingTasks,
      sub: "pending",
      path: "/tasks",
    },
    {
      icon: Users,
      label: "Family",
      count: data.members.length,
      sub: "members",
      path: "/family",
    },
    {
      icon: Phone,
      label: "Phone Lines",
      count: data.members.filter((m) => m.phone).length,
      sub: "connected",
      path: "/family",
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in">
        <img src={maiLogo} alt="Mai" className="w-12 h-12 rounded-2xl shadow-sm" />
        <div>
          <p className="text-sm text-muted-foreground">Good morning 👋</p>
          <h1 className="text-2xl font-semibold tracking-tight">{data.familyName}</h1>
        </div>
      </div>

      {/* Voice assistant status */}
      <div className="bg-primary/10 rounded-2xl p-4 mb-6 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Mai Voice Assistant</p>
            <p className="text-xs text-muted-foreground">Active · Ready to take calls</p>
          </div>
        </div>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickCards.map(({ icon: Icon, label, count, sub, path }, i) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="bg-card rounded-2xl p-4 text-left border border-border hover:shadow-md transition-shadow animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Icon className="w-5 h-5 text-primary mb-3" />
            <p className="text-2xl font-serif font-semibold">{count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sub} · {label}
            </p>
          </button>
        ))}
      </div>

      {/* Recent tasks */}
      <div className="animate-slide-up" style={{ animationDelay: "300ms" }}>
        <h2 className="text-lg font-serif font-semibold mb-3">Today's Tasks</h2>
        <div className="space-y-2">
          {data.tasks
            .filter((t) => !t.completed)
            .slice(0, 3)
            .map((task) => (
              <div
                key={task.id}
                className="bg-card rounded-xl p-3 border border-border flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
                  {data.members.find((m) => m.name === task.assignedTo)?.avatar || "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.assignedTo} · {task.dueDate}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
