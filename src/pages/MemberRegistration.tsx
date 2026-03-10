import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DaumPostcode from "react-daum-postcode";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { loadData, saveData, saveImage, isTauriEnv } from "../utils/fileStorage";
// removed original non-tauri imports
import { CustomSelect } from "../components/common/CustomSelect";
import { MemberSelect } from "../components/common/MemberSelect";
const MEMBERS_STORAGE_KEY = "church_erp_members";

interface OrgGroup {
  id: string;
  name: string;
  count: number;
  expanded: boolean;
  children: { id: string; name: string; active: boolean }[];
}

interface Member {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  address: string;
  role: string;
  zone: string;
  joinDate: string;
  memo: string;
  profileImage?: string; // 이미지 경로
  status: string; // 교적 상태 (등록, 방문 등)
  baptism: string;
  familyHead?: string;
  moveDate?: string; // 전출일 (이명일)
}

function MemberRegistration() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID for edit mode
  const isEditMode = !!id;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // States
  const [orgTree, setOrgTree] = useState<OrgGroup[]>([
    {
      id: "1",
      name: "1교구",
      count: 0,
      expanded: true,
      children: [
        { id: "1-1", name: "1-1 구역", active: true },
        { id: "1-2", name: "1-2 구역", active: false },
        { id: "1-3", name: "1-3 구역", active: false },
      ],
    },
    { id: "2", name: "2교구", count: 0, expanded: false, children: [] },
    { id: "3", name: "청년부", count: 0, expanded: false, children: [] },
    { id: "4", name: "주일학교", count: 0, expanded: false, children: [] },
  ]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    gender: "male",
    birthDate: "",
    phone: "",
    zipCode: "",
    address: "",
    addressDetail: "",
    registrationDate: new Date().toISOString().split("T")[0],
    position: "new",
    baptism: "none",
    familyHead: "",
    districtId: "", // ID of the selected OrgGroup
    zoneId: "",     // ID of the selected Child
    memo: "",
    status: "registered", // registered, visitor, etc.
    moveDate: new Date().toISOString().split("T")[0],
  });

  // Load Organization Tree
  useEffect(() => {
    const fetchOrgTree = async () => {
      try {
        const loadedOrg = await loadData<OrgGroup[]>("org_groups");
        if (loadedOrg) {
          setOrgTree(loadedOrg);
        }
      } catch (e) {
        console.error("Failed to load org tree", e);
        // Fallback or leave as default
      }
    };
    fetchOrgTree();
  }, []);

  // Load Members for Dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      let data = await loadData<Member[]>("members");

      // Fallback to LocalStorage if File System is empty/failed
      if (!data || data.length === 0) {
        const savedMembers = localStorage.getItem(MEMBERS_STORAGE_KEY);
        if (savedMembers) {
          try {
            data = JSON.parse(savedMembers);
          } catch (e) {
            console.error("Failed to parse local storage members", e);
          }
        }
      }

      if (data) setMembers(data);
    };
    fetchMembers();
  }, []);

  // Load Member Data for Editing
  useEffect(() => {
    if (!isEditMode || !id) return;

    const fetchMember = async () => {
      try {
        const members = await loadData<Member[]>("members") || [];
        const member = members.find(m => m.id === id);

        if (member) {
          const roleMap: Record<string, string> = {
            "성도": "new", "서리집사": "member", "안수집사": "deacon",
            "권사": "elder_woman", "장로": "elder", "목사": "pastor"
          };
          // Find positionCode by matching member.role to roleMap values
          const matchedEntry = Object.entries(roleMap).find(([key]) => key === member.role);
          const positionCode = matchedEntry ? matchedEntry[1] : "new";

          setFormData({
            name: member.name,
            gender: member.gender,
            birthDate: member.birthDate === "undefined" ? "" : member.birthDate || "",
            phone: member.phone,
            zipCode: "",
            address: member.address || "",
            addressDetail: "",
            registrationDate: member.joinDate || "",
            position: positionCode,
            baptism: member.baptism || "none",
            familyHead: member.familyHead || "",
            districtId: "",
            zoneId: "",
            memo: member.memo,
            status: member.status || "registered",
            moveDate: member.moveDate || new Date().toISOString().split("T")[0],
          });

          if (member.profileImage) {
            if (member.profileImage.startsWith('data:') || member.profileImage.startsWith('http')) {
              setPreviewImage(member.profileImage);
            } else if (isTauriEnv()) {
              setPreviewImage(convertFileSrc(member.profileImage));
            } else {
              setPreviewImage(member.profileImage);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load member for edit", e);
      }
    };
    fetchMember();
  }, [id, isEditMode]);

  // Match Zone ID once OrgTree and FormData are ready
  // (Simplified Logic: we iterate tree to find matching zone name)
  useEffect(() => {
    if (isEditMode && orgTree.length > 0 && formData.name) {
      const loadZone = async () => {
        const members = await loadData<Member[]>("members") || [];
        const member = members.find(m => m.id === id);
        if (!member) return;

        let dId = "";
        let zId = "";

        for (const group of orgTree) {
          const child = group.children.find(c => c.name === member.zone); // Or however zone is stored
          // Note: member.zone currently stores just the child name e.g. "1-1 구역"
          if (child) {
            dId = group.id;
            zId = child.id;
            break;
          }
        }
        if (dId && zId) {
          setFormData(prev => ({ ...prev, districtId: dId, zoneId: zId }));
        }
      };
      loadZone();
    }
  }, [orgTree, isEditMode, id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 이미지 업로드 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다.");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 주소 검색 완료 핸들러
  const handleAddressComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress += (extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName);
      }
      fullAddress += (extraAddress !== "" ? ` (${extraAddress})` : "");
    }

    setFormData((prev) => ({
      ...prev,
      zipCode: data.zonecode,
      address: fullAddress,
    }));
    setShowAddressModal(false);
  };

  // 직분 라벨
  const getPositionLabel = (position: string): string => {
    const labels: Record<string, string> = {
      new: "성도",
      member: "서리집사",
      deacon: "안수집사",
      elder_woman: "권사",
      elder: "장로",
      pastor: "목사",
    };
    return labels[position] || "성도";
  };

  // 구역명 가져오기
  const getZoneName = () => {
    if (!formData.districtId || !formData.zoneId) return "미배정";
    const group = orgTree.find(g => g.id === formData.districtId);
    const child = group?.children.find(c => c.id === formData.zoneId);
    return child ? child.name : "미배정"; // Members.tsx data matching
  };

  const handleSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    if (submitStatus) return; // Prevent double submission

    // IME 입력 지연 문제 해결을 위해 DOM 값을 직접 참조
    const currentName = nameInputRef.current?.value || formData.name;

    // 필수 필드 검증 (이름만 필수, 전화번호는 옵션)
    if (!currentName.trim()) {
      alert("성명을 입력해주세요.");
      nameInputRef.current?.focus();
      return;
    }

    setSubmitStatus("처리를 시작합니다...");
    console.log("Submitting form:", formData, "Name:", currentName);

    try {
      // 1. 이미지 저장
      let imagePath = "";
      if (selectedFile) {
        try {
          setSubmitStatus("이미지 업로드 중...");
          console.log("Saving image...");
          const buffer = await selectedFile.arrayBuffer();
          imagePath = await saveImage(new Uint8Array(buffer), selectedFile.name);
          console.log("Image saved at:", imagePath);

          // Browser environment fallback: ensure image is saved as Base64 if file access fails
          if (!imagePath && !isTauriEnv() && previewImage) {
            console.warn("Using Base64 fallback for image");
            imagePath = previewImage;
          }

          if (!imagePath && isTauriEnv()) {
            throw new Error("이미지 저장에 실패했습니다 (경로 반환 없음)");
          }
        } catch (imgErr: any) {
          console.error("Image save error:", imgErr);
          const msg = typeof imgErr === 'string' ? imgErr : (imgErr.message || JSON.stringify(imgErr));
          throw new Error(`이미지 저장 실패: ${msg}`);
        }
      }

      setSubmitStatus("데이터 저장 중...");

      // 2. 새 성도 객체 생성 (or Edit)
      const memberData: Member = {
        id: isEditMode && id ? id : Date.now().toString(),
        name: currentName,
        gender: formData.gender,
        birthDate: formData.birthDate,
        phone: formData.phone,
        address: formData.addressDetail ? `${formData.address} ${formData.addressDetail}`.trim() : formData.address,
        role: getPositionLabel(formData.position),
        zone: getZoneName(), // 구역명 조합
        joinDate: formData.registrationDate,
        memo: formData.memo,
        profileImage: imagePath || (isEditMode ? undefined : ""),
        status: formData.status,
        baptism: formData.baptism,
        familyHead: formData.familyHead,
        moveDate: formData.status === "moved" ? formData.moveDate : undefined,
      };

      // 3. 기존 데이터 로드 (파일 시스템)
      const existingMembers = await loadData<Member[]>("members") || [];

      let updatedMembers;
      if (isEditMode) {
        updatedMembers = existingMembers.map(m => {
          if (m.id === id) {
            return {
              ...memberData,
              profileImage: imagePath ? imagePath : m.profileImage
            };
          }
          return m;
        });
      } else {
        updatedMembers = [...existingMembers, memberData];
      }

      // 4. 저장
      await saveData("members", updatedMembers);

      // 로컬 스토리지도 백업
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));

      alert("성도 등록이 완료되었습니다!");
      navigate("/members");
    } catch (error: any) {
      console.error("Failed to register member:", error);
      const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      alert(`등록 중 오류가 발생했습니다: ${msg}`);
    } finally {
      setSubmitStatus(null);
    }
  };

  return (
    <div className="members-page">


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
            <h2 className="page-header__title">{isEditMode ? "성도 정보 수정" : "성도 신규 등록"}</h2>
            <p className="page-header__description">
              {isEditMode ? "성도의 등록된 정보를 수정 및 관리합니다." : "새로운 성도의 정보를 입력하여 교적에 등록합니다."}
            </p>
          </div>

          {/* Form */}
          <form className="form-card" onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            <div className="form-section">
              <div className="form-section__layout">
                <div className="form-section__photo">
                  <div
                    className="photo-upload"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundImage: previewImage ? `url(${previewImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative'
                    }}
                  >
                    {!previewImage && (
                      <>
                        <span className="material-symbols-outlined">add_a_photo</span>
                        <span>사진 등록</span>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleImageChange}
                    />
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
                        ref={nameInputRef}
                        type="text"
                        className="form-input"
                        placeholder="예: 홍길동"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
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
                        휴대전화 <span className="text-secondary" style={{ fontWeight: 400, fontSize: '0.8em' }}>(선택)</span>
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
                        <button type="button" className="form-btn" onClick={() => setShowAddressModal(true)}>
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
                        등록일자
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
                        상태
                      </label>
                      <CustomSelect
                        value={formData.status}
                        onChange={(val: string) => handleInputChange("status", val)}
                        options={[
                          { value: "registered", label: "등록 교인" },
                          { value: "visitor", label: "방문자 (새신자)" },
                          { value: "long_absent", label: "장기 결석" },
                          { value: "moved", label: "이명 (전출)" },
                          { value: "other", label: "기타" },
                        ]}
                      />
                    </div>

                    {formData.status === "moved" && (
                      <div className="form-group">
                        <label className="form-label">전출일 (이명일)</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.moveDate}
                          onChange={(e) => handleInputChange("moveDate", e.target.value)}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">
                        직분
                      </label>
                      <CustomSelect
                        value={formData.position}
                        onChange={(val: string) => handleInputChange("position", val)}
                        options={[
                          { value: "new", label: "성도 (새신자)" },
                          { value: "member", label: "서리집사" },
                          { value: "deacon", label: "안수집사" },
                          { value: "elder_woman", label: "권사" },
                          { value: "elder", label: "장로" },
                          { value: "pastor", label: "목사" },
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">신급 (세례)</label>
                      <CustomSelect
                        value={formData.baptism}
                        onChange={(val: string) => handleInputChange("baptism", val)}
                        options={[
                          { value: "none", label: "학습/세례 없음" },
                          { value: "learning", label: "학습교인" },
                          { value: "baptism", label: "세례교인" },
                          { value: "child_baptism", label: "유아세례" },
                          { value: "confirmation", label: "입교인" },
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">신앙세대주</label>
                      <MemberSelect
                        value={formData.familyHead}
                        onChange={(val: string) => handleInputChange("familyHead", val)}
                        members={members}
                        placeholder="세대주 검색"
                      />
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
                      <label className="form-label">교구/부서 선택</label>
                      <CustomSelect
                        value={formData.districtId}
                        onChange={(val: string) => {
                          setFormData(prev => ({ ...prev, districtId: val, zoneId: "" }));
                        }}
                        options={[
                          { value: "", label: "선택하세요" },
                          ...orgTree.map(group => ({ value: group.id, label: group.name }))
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">구역/소그룹 선택</label>
                      <CustomSelect
                        value={formData.zoneId}
                        onChange={(val: string) => handleInputChange("zoneId", val)}
                        disabled={!formData.districtId}
                        options={[
                          { value: "", label: "선택하세요" },
                          ...(formData.districtId && orgTree.find(g => g.id === formData.districtId)?.children.map(child => ({ value: child.id, label: child.name })) || [])
                        ]}
                      />
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
              <button
                type="button"
                className="btn btn--primary"
                disabled={!!submitStatus}
                onClick={handleSubmit}
              >
                {submitStatus ? (
                  <>
                    <span className="material-symbols-outlined spin">sync</span>
                    {submitStatus}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    {isEditMode ? "수정 완료" : "등록 완료"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Daum Postcode Modal */}
      {showAddressModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ width: '500px', backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>주소 검색</h3>
              <button onClick={() => setShowAddressModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <DaumPostcode onComplete={handleAddressComplete} />
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberRegistration;
