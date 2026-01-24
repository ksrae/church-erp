import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

function MemberRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    gender: "male",
    birthDate: "",
    phone: "",
    zipCode: "",
    address: "",
    addressDetail: "",
    registrationDate: new Date().toISOString().split("T")[0],
    position: "",
    baptism: "none",
    familyHead: "",
    district: "",
    zone: "",
    memo: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Submitted:", formData);
    alert("성도 등록이 완료되었습니다!");
    navigate("/members");
  };

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
            <button className="org-tree__item expanded">
              <span className="material-symbols-outlined">expand_more</span>
              <span>1교구</span>
              <span className="org-tree__count">142</span>
            </button>
            <div className="org-tree__children">
              <button className="org-tree__child active">
                <div className="org-tree__child-label">
                  <span className="org-tree__child-dot" />
                  <span>1-1 구역</span>
                </div>
              </button>
              <button className="org-tree__child">
                <div className="org-tree__child-label">
                  <span className="org-tree__child-dot" />
                  <span>1-2 구역</span>
                </div>
              </button>
              <button className="org-tree__child">
                <div className="org-tree__child-label">
                  <span className="org-tree__child-dot" />
                  <span>1-3 구역</span>
                </div>
              </button>
            </div>
            <button className="org-tree__item collapsed">
              <span className="material-symbols-outlined">expand_more</span>
              <span>2교구</span>
              <span className="org-tree__count">98</span>
            </button>
            <button className="org-tree__item collapsed">
              <span className="material-symbols-outlined">expand_more</span>
              <span>청년부</span>
              <span className="org-tree__count">210</span>
            </button>
            <button className="org-tree__item collapsed">
              <span className="material-symbols-outlined">expand_more</span>
              <span>주일학교</span>
              <span className="org-tree__count">54</span>
            </button>
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
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <a href="#" onClick={() => navigate("/members")}>성도 관리</a>
            <span className="material-symbols-outlined">chevron_right</span>
            <span className="breadcrumb__current">신규 등록</span>
          </div>

          {/* Page Header */}
          <div className="page-header">
            <h2 className="page-header__title">성도 신규 등록</h2>
            <p className="page-header__description">
              새로운 성도의 정보를 입력하여 교적에 등록합니다.
            </p>
          </div>

          {/* Form */}
          <form className="form-card" onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            <div className="form-section">
              <div className="form-section__layout">
                <div className="form-section__photo">
                  <div className="photo-upload">
                    <span className="material-symbols-outlined">add_a_photo</span>
                    <span>사진 등록</span>
                  </div>
                  <p className="photo-upload__hint">
                    JPG, PNG 형식<br />(최대 5MB)
                  </p>
                </div>

                <div className="form-section__fields">
                  <h3 className="form-section__title">
                    <span className="material-symbols-outlined">person</span>
                    기본 정보
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        성명 <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="예: 홍길동"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        성별 <span className="required">*</span>
                      </label>
                      <div className="form-radio-group">
                        <label className="form-radio">
                          <input
                            type="radio"
                            name="gender"
                            checked={formData.gender === "male"}
                            onChange={() => handleInputChange("gender", "male")}
                          />
                          <span>남성</span>
                        </label>
                        <label className="form-radio">
                          <input
                            type="radio"
                            name="gender"
                            checked={formData.gender === "female"}
                            onChange={() => handleInputChange("gender", "female")}
                          />
                          <span>여성</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">생년월일</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange("birthDate", e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        휴대전화 <span className="required">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="010-0000-0000"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    </div>

                    <div className="form-group form-group--full">
                      <label className="form-label">주소</label>
                      <div className="form-input-group" style={{ marginBottom: "0.5rem" }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="우편번호"
                          value={formData.zipCode}
                          readOnly
                          style={{ width: "8rem", flex: "none" }}
                        />
                        <button type="button" className="form-btn">
                          주소 검색
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="기본 주소"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        style={{ marginBottom: "0.5rem" }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="상세 주소 입력"
                        value={formData.addressDetail}
                        onChange={(e) => handleInputChange("addressDetail", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Church Info Section */}
            <div className="form-section">
              <div className="form-section__layout">
                <div className="form-section__photo" style={{ width: "8rem" }} />
                <div className="form-section__fields">
                  <h3 className="form-section__title">
                    <span className="material-symbols-outlined">church</span>
                    교적 정보
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        등록일자 <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.registrationDate}
                        onChange={(e) => handleInputChange("registrationDate", e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        직분 <span className="required">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.position}
                        onChange={(e) => handleInputChange("position", e.target.value)}
                      >
                        <option value="" disabled>직분 선택</option>
                        <option value="new">성도 (새신자)</option>
                        <option value="member">서리집사</option>
                        <option value="deacon">안수집사</option>
                        <option value="elder_woman">권사</option>
                        <option value="elder">장로</option>
                        <option value="pastor">목사</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">신급 (세례)</label>
                      <select
                        className="form-select"
                        value={formData.baptism}
                        onChange={(e) => handleInputChange("baptism", e.target.value)}
                      >
                        <option value="none">학습/세례 없음</option>
                        <option value="learning">학습교인</option>
                        <option value="baptism">세례교인</option>
                        <option value="child_baptism">유아세례</option>
                        <option value="confirmation">입교인</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">신앙세대주</label>
                      <div className="form-input-group">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="세대주 검색"
                          value={formData.familyHead}
                          onChange={(e) => handleInputChange("familyHead", e.target.value)}
                        />
                        <button type="button" className="form-btn" style={{ padding: "0.5rem" }}>
                          <span className="material-symbols-outlined">search</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Affiliation Section */}
            <div className="form-section">
              <div className="form-section__layout">
                <div className="form-section__photo" style={{ width: "8rem" }} />
                <div className="form-section__fields">
                  <h3 className="form-section__title">
                    <span className="material-symbols-outlined">diversity_3</span>
                    소속 설정
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">교구 선택</label>
                      <select
                        className="form-select"
                        value={formData.district}
                        onChange={(e) => handleInputChange("district", e.target.value)}
                      >
                        <option value="" disabled>교구 선택</option>
                        <option value="1">1교구</option>
                        <option value="2">2교구</option>
                        <option value="youth">청년부</option>
                        <option value="school">주일학교</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">구역/부서 선택</label>
                      <select
                        className="form-select"
                        value={formData.zone}
                        onChange={(e) => handleInputChange("zone", e.target.value)}
                      >
                        <option value="" disabled>먼저 교구를 선택하세요</option>
                      </select>
                    </div>

                    <div className="form-group form-group--full">
                      <label className="form-label">메모 (비고)</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="특이사항이나 참고할 내용을 입력하세요."
                        value={formData.memo}
                        onChange={(e) => handleInputChange("memo", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="form-footer">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/members")}
              >
                취소
              </button>
              <button type="submit" className="btn btn--primary">
                <span className="material-symbols-outlined">check</span>
                등록 완료
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default MemberRegistration;
