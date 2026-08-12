interface AnnouncementsProps {
  items: any[];
}

export default function Announcements({ items }: AnnouncementsProps) {
  if (items.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        No announcements yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={`p-4 rounded-xl border ${
            item.type === 'emergency' ? 'bg-red-500/10 border-red-500/20' :
            item.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
            'bg-slate-800 border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-semibold ${
                item.type === 'emergency' ? 'text-red-400' :
                item.type === 'warning' ? 'text-amber-400' :
                'text-white'
              }`}>
                {item.title}
              </h3>
              <p className="text-sm text-slate-300 mt-1">{item.message}</p>
            </div>
            <span className="text-xs text-slate-500">
              {new Date(item.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}