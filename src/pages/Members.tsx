import { Link } from "react-router-dom";

function Members() {
  const orgTree = [
    {
      name: "1교구",
      count: 142,
      expanded: true,
      children: [
        { name: "1-1 구역", active: true },
        { name: "1-2 구역", active: false },
        { name: "1-3 구역", active: false },
      ],
    },
    { name: "2교구", count: 98, expanded: false, children: [] },
    { name: "청년부", count: 210, expanded: false, children: [] },
    { name: "주일학교", count: 54, expanded: false, children: [] },
  ];

  const members = [
    { name: "김철수", role: "장로", phone: "010-1234-5678", zone: "1-1 구역" },
    { name: "이영희", role: "권사", phone: "010-2345-6789", zone: "1-1 구역" },
    { name: "박민준", role: "집사", phone: "010-3456-7890", zone: "1-1 구역" },
    { name: "최수진", role: "성도", phone: "010-4567-8901", zone: "1-1 구역" },
    { name: "정은우", role: "집사", phone: "010-5678-9012", zone: "1-1 구역" },
  ];

  return (
    <div className="members-page">
      {/* Sidebar */}
      <aside className="members-sidebar">
        <div className="members-sidebar__header">
          <div>
            <h2 className="members-sidebar__title">조직도</h2>
            <p className="members-sidebar__subtitle">교회 조직 및 부서 관리</p>
          </div>
          <button className="members-sidebar__add-btn" title="그룹 추가">
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <nav className="members-sidebar__nav">
          <div className="org-tree">
            {orgTree.map((org, index) => (
              <div key={index}>
                <button
                  className={`org-tree__item ${org.expanded ? "expanded" : "collapsed"
                    }`}
                >
                  <span className="material-symbols-outlined">expand_more</span>
                  <span>{org.name}</span>
                  <span className="org-tree__count">{org.count}</span>
                </button>
                {org.expanded && org.children.length > 0 && (
                  <div className="org-tree__children">
                    {org.children.map((child, childIndex) => (
                      <button
                        key={childIndex}
                        className={`org-tree__child ${child.active ? "active" : ""
                          }`}
                      >
                        <div className="org-tree__child-label">
                          <span className="org-tree__child-dot" />
                          <span>{child.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="members-sidebar__footer">
          <span className="material-symbols-outlined">info</span>
          <span>우클릭으로 그룹 편집 가능</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="members-content">
        <div className="members-content__inner">
          <div className="breadcrumb">
            <a href="#">성도 관리</a>
            <span className="material-symbols-outlined">chevron_right</span>
            <span className="breadcrumb__current">1-1 구역</span>
          </div>

          <div className="page-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="page-header__title">1-1 구역 성도 목록</h2>
                <p className="page-header__description">
                  총 {members.length}명의 성도가 등록되어 있습니다.
                </p>
              </div>
              <Link to="/members/register" className="btn btn--primary">
                <span className="material-symbols-outlined">person_add</span>
                성도 등록
              </Link>
            </div>
          </div>

          {/* Members List */}
          <div className="form-card">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>직분</th>
                  <th>연락처</th>
                  <th>소속</th>
                  <th className="text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{member.name}</strong>
                    </td>
                    <td>{member.role}</td>
                    <td>{member.phone}</td>
                    <td>{member.zone}</td>
                    <td className="text-center">
                      <button className="view-detail-btn" title="상세보기">
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Members;
