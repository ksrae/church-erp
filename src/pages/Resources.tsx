import { useState, useEffect } from "react";

const RESOURCES_STORAGE_KEY = "church_erp_resources";

interface Resource {
  id: string;
  title: string;
  description: string;
  tag: string;
  date: string;
  author: string;
  duration?: string;
  fileType?: string;
  imageUrl?: string;
}

function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const filters = [
    { id: "all", name: "전체" },
    { id: "sermon", name: "주일 예배" },
    { id: "prayer", name: "수요 기도회" },
    { id: "education", name: "교육 부서" },
    { id: "bulletin", name: "주보/행사" },
  ];

  // 저장된 자료 데이터 로드
  useEffect(() => {
    const savedResources = localStorage.getItem(RESOURCES_STORAGE_KEY);
    if (savedResources) {
      try {
        const parsed = JSON.parse(savedResources);
        setResources(parsed);
      } catch {
        // 파싱 에러
      }
    }
  }, []);

  // 필터링된 자료
  const filteredResources =
    selectedFilter === "all"
      ? resources
      : resources.filter((r) => r.tag === selectedFilter);

  return (
    <div className="resources-page">
      {/* Sidebar */}
      <aside className="resources-sidebar">
        <div className="resources-sidebar__section">
          <h3 className="resources-sidebar__title">자료실 필터</h3>
          <nav className="resources-nav">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`resources-nav__item ${selectedFilter === filter.id ? "active" : ""
                  }`}
                onClick={() => setSelectedFilter(filter.id)}
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: selectedFilter === filter.id ? "rgba(22, 100, 156, 0.1)" : "transparent",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                {filter.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="resources-sidebar__section" style={{ marginTop: "1.5rem" }}>
          <h3 className="resources-sidebar__title">통계</h3>
          <nav className="resources-nav">
            <span
              className="resources-nav__item"
              style={{ fontSize: "0.875rem", color: "#64748b" }}
            >
              📁 전체 자료: {resources.length}개
            </span>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="resources-content">
        <div className="resources-content__header">
          <h1 className="resources-content__title">설교 및 사역 자료실</h1>
          <p className="resources-content__subtitle">
            지난 설교 영상, 주보, 교육 자료를 안전하게 보관하고 관리합니다.
          </p>
          <div className="resources-content__actions">
            <div className="resources-view-toggle">
              <button className="resources-view-btn active">
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button className="resources-view-btn">
                <span className="material-symbols-outlined">view_list</span>
              </button>
            </div>
            <button className="resources-add-btn">
              <span className="material-symbols-outlined">add</span>
              새 자료 등록
            </button>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="resources-grid">
          {filteredResources.length > 0 ? (
            filteredResources.map((resource) => (
              <div className="resource-card" key={resource.id}>
                <div
                  className="resource-card__image"
                  style={{
                    backgroundImage: resource.imageUrl
                      ? `url('${resource.imageUrl}')`
                      : undefined,
                    backgroundColor: resource.imageUrl ? undefined : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!resource.imageUrl && (
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "2.5rem", color: "#9ca3af" }}
                    >
                      folder_open
                    </span>
                  )}
                  <span className="resource-card__tag">{resource.tag}</span>
                  {resource.duration && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "0.5rem",
                        right: "0.5rem",
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        fontSize: "0.625rem",
                        padding: "0.125rem 0.375rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {resource.duration}
                    </span>
                  )}
                </div>
                <div className="resource-card__content">
                  <p className="resource-card__date">{resource.date}</p>
                  <h3 className="resource-card__title">{resource.title}</h3>
                  <p className="resource-card__description">
                    {resource.description}
                  </p>
                </div>
                <div className="resource-card__footer">
                  <div
                    className="resource-card__author-avatar"
                    style={{ background: "#e2e8f0" }}
                  />
                  <span className="resource-card__author-name">
                    {resource.author}
                  </span>
                  <div className="resource-card__actions">
                    <button className="resource-card__action-btn">
                      <span className="material-symbols-outlined">download</span>
                    </button>
                    <button className="resource-card__action-btn">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "4rem",
                color: "var(--text-secondary)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "4rem",
                  marginBottom: "1rem",
                  display: "block",
                }}
              >
                folder_off
              </span>
              <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                등록된 자료가 없습니다.
              </p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                "새 자료 등록" 버튼을 클릭하여 자료를 추가해주세요.
              </p>
            </div>
          )}

          {/* Add New Card */}
          <div className="add-resource-card">
            <div className="add-resource-card__icon">
              <span className="material-symbols-outlined">add</span>
            </div>
            <h3 className="add-resource-card__title">새 자료 추가</h3>
            <p className="add-resource-card__text">
              설교 영상, 주보 또는 이미지
              <br />
              자료를 드래그하세요.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Resources;
