import { recentIds, searchTools, toolById, tools, type Tool } from "../data/tools";
import { ToolCard } from "../components/ToolCard";

type Props = { query: string; pins: string[]; onPin: (id: string) => void };

export function Home({ query, pins, onPin }: Props) {
  const section = (title: string, list: Tool[]) => (
    <section className="dx-section">
      <h2 className="dx-subtitle">{title}</h2>
      <div className="dx-toolgrid">
        {list.map((t) => (
          <ToolCard key={t.id} tool={t} pinned={pins.includes(t.id)} onPin={() => onPin(t.id)} />
        ))}
      </div>
    </section>
  );
  const byIds = (ids: string[]) => ids.map((id) => toolById(id)!);

  if (query.trim()) {
    const hits = searchTools(query);
    return (
      <>
        <h1 className="dx-title">Kết quả tìm kiếm</h1>
        <p className="dx-lead">
          {hits.length
            ? `${hits.length} công cụ khớp “${query.trim()}”, nhấn Enter để mở kết quả đầu tiên`
            : `Không có công cụ nào khớp “${query.trim()}”`}
        </p>
        {hits.length > 0 && section("Kết quả", hits)}
      </>
    );
  }

  return (
    <>
      <h1 className="dx-title">Tất cả công cụ</h1>
      <p className="dx-lead">{tools.length} công cụ, chạy hoàn toàn offline</p>
      {section("Gần đây", byIds(recentIds))}
      {pins.length > 0 && section("Đã ghim", byIds(pins))}
      {section("Tất cả", tools)}
    </>
  );
}
