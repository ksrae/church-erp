import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DaumPostcode from "react-daum-postcode";
import { loadData, saveData, uploadFile } from "../utils/fileStorage";
import { CustomSelect } from "../components/common/CustomSelect";
import { MemberSelect } from "../components/common/MemberSelect";
import { useLocale } from "../i18n/LocaleContext";
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
  profileImage?: string;
  status: string;
  baptism: string;
  familyHead?: string;
  moveDate?: string;
}

function MemberRegistration() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { t } = useLocale();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [orgTree, setOrgTree] = useState<OrgGroup[]>([
    {
      id: "1",
      name: t("members.orgDefault.parish1"),
      count: 0,
      expanded: true,
      children: [
        { id: "1-1", name: t("members.orgDefault.zone11"), active: true },
        { id: "1-2", name: t("members.orgDefault.zone12"), active: false },
        { id: "1-3", name: t("members.orgDefault.zone13"), active: false },
      ],
    },
    { id: "2", name: t("members.orgDefault.parish2"), count: 0, expanded: false, children: [] },
    { id: "3", name: t("members.orgDefault.youth"), count: 0, expanded: false, children: [] },
    { id: "4", name: t("members.orgDefault.sundaySchool"), count: 0, expanded: false, children: [] },
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
    districtId: "",
    zoneId: "",
    memo: "",
    status: "registered",
    moveDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchOrgTree = async () => {
      try {
        const loadedOrg = await loadData<OrgGroup[]>("org_groups");
        if (loadedOrg) {
          setOrgTree(loadedOrg);
        }
      } catch (e) {
        console.error("Failed to load org tree", e);
      }
    };
    fetchOrgTree();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      let data = await loadData<Member[]>("members");

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
            setPreviewImage(member.profileImage);
          }
        }
      } catch (e) {
        console.error("Failed to load member for edit", e);
      }
    };
    fetchMember();
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode && orgTree.length > 0 && formData.name) {
      const loadZone = async () => {
        const members = await loadData<Member[]>("members") || [];
        const member = members.find(m => m.id === id);
        if (!member) return;

        let dId = "";
        let zId = "";

        for (const group of orgTree) {
          const child = group.children.find(c => c.name === member.zone);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t("memberReg.alert.fileSize"));
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

  // Role labels stored in Korean for legacy data compatibility
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

  const getZoneName = () => {
    if (!formData.districtId || !formData.zoneId) return t("memberReg.unassigned");
    const group = orgTree.find(g => g.id === formData.districtId);
    const child = group?.children.find(c => c.id === formData.zoneId);
    return child ? child.name : t("memberReg.unassigned");
  };

  const handleSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    if (submitStatus) return;

    const currentName = nameInputRef.current?.value || formData.name;

    if (!currentName.trim()) {
      alert(t("memberReg.alert.nameRequired"));
      nameInputRef.current?.focus();
      return;
    }

    setSubmitStatus(t("memberReg.submit.start"));
    console.log("Submitting form:", formData, "Name:", currentName);

    try {
      let imagePath = "";
      if (selectedFile) {
        try {
          setSubmitStatus(t("memberReg.submit.imageUploading"));
          const ext = selectedFile.name.split(".").pop() || "jpg";
          const filename = `images/members/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
          imagePath = await uploadFile(selectedFile, filename);
        } catch (imgErr: any) {
          console.error("Image upload error:", imgErr);
          throw new Error(t("memberReg.submit.imageFailed", { msg: imgErr.message }));
        }
      }

      setSubmitStatus(t("memberReg.submit.saving"));

      const memberData: Member = {
        id: isEditMode && id ? id : Date.now().toString(),
        name: currentName,
        gender: formData.gender,
        birthDate: formData.birthDate,
        phone: formData.phone,
        address: formData.addressDetail ? `${formData.address} ${formData.addressDetail}`.trim() : formData.address,
        role: getPositionLabel(formData.position),
        zone: getZoneName(),
        joinDate: formData.registrationDate,
        memo: formData.memo,
        profileImage: imagePath || (isEditMode ? undefined : ""),
        status: formData.status,
        baptism: formData.baptism,
        familyHead: formData.familyHead,
        moveDate: formData.status === "moved" ? formData.moveDate : undefined,
      };

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

      await saveData("members", updatedMembers);

      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));

      alert(t("memberReg.submit.success"));
      navigate("/members");
    } catch (error: any) {
      console.error("Failed to register member:", error);
      const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      alert(t("memberReg.submit.error", { msg }));
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
            <a href="#" onClick={() => navigate("/members")}>{t("memberReg.breadcrumb.root")}</a>
            <span className="material-symbols-outlined">chevron_right</span>
            <span className="breadcrumb__current">{t("memberReg.breadcrumb.new")}</span>
          </div>

          {/* Page Header */}
          <div className="page-header">
            <h2 className="page-header__title">{isEditMode ? t("memberReg.pageTitle.edit") : t("memberReg.pageTitle.new")}</h2>
            <p className="page-header__description">
              {isEditMode ? t("memberReg.pageDesc.edit") : t("memberReg.pageDesc.new")}
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
                        <span>{t("memberReg.photo.upload")}</span>
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
                  <p className="photo-upload__hint" style={{ whiteSpace: "pre-line" }}>
                    {t("memberReg.photo.hint")}
                  </p>
                </div>

                <div className="form-section__fields">
                  <h3 className="form-section__title">
                    <span className="material-symbols-outlined">person</span>
                    {t("memberReg.section.basic")}
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        {t("memberReg.field.name")} <span className="required">*</span>
                      </label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        className="form-input"
                        placeholder={t("memberReg.field.namePlaceholder")}
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {t("memberReg.field.gender")} <span className="required">*</span>
                      </label>
                      <div className="form-radio-group">
                        <label className="form-radio">
                          <input
                            type="radio"
                            name="gender"
                            checked={formData.gender === "male"}
                            onChange={() => handleInputChange("gender", "male")}
                          />
                          <span>{t("memberReg.field.male")}</span>
                        </label>
                        <label className="form-radio">
                          <input
                            type="radio"
                            name="gender"
                            checked={formData.gender === "female"}
                            onChange={() => handleInputChange("gender", "female")}
                          />
                          <span>{t("memberReg.field.female")}</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t("memberReg.field.birthDate")}</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange("birthDate", e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {t("memberReg.field.phone")} <span className="text-secondary" style={{ fontWeight: 400, fontSize: '0.8em' }}>{t("memberReg.field.phoneOptional")}</span>
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
                      <label className="form-label">{t("memberReg.field.address")}</label>
                      <div className="form-input-group" style={{ marginBottom: "0.5rem" }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={t("memberReg.field.zipCode")}
                          value={formData.zipCode}
                          readOnly
                          style={{ width: "8rem", flex: "none" }}
                        />
                        <button type="button" className="form-btn" onClick={() => setShowAddressModal(true)}>
                          {t("memberReg.field.searchAddress")}
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={t("memberReg.field.addressBasic")}
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        style={{ marginBottom: "0.5rem" }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder={t("memberReg.field.addressDetail")}
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
                    {t("memberReg.section.church")}
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        {t("memberReg.field.registrationDate")}
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
                        {t("memberReg.field.status")}
                      </label>
                      <CustomSelect
                        value={formData.status}
                        onChange={(val: string) => handleInputChange("status", val)}
                        options={[
                          { value: "registered", label: t("memberReg.status.registered") },
                          { value: "visitor", label: t("memberReg.status.visitor") },
                          { value: "long_absent", label: t("memberReg.status.longAbsent") },
                          { value: "moved", label: t("memberReg.status.moved") },
                          { value: "other", label: t("memberReg.status.other") },
                        ]}
                      />
                    </div>

                    {formData.status === "moved" && (
                      <div className="form-group">
                        <label className="form-label">{t("memberReg.field.moveDate")}</label>
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
                        {t("memberReg.field.position")}
                      </label>
                      <CustomSelect
                        value={formData.position}
                        onChange={(val: string) => handleInputChange("position", val)}
                        options={[
                          { value: "new", label: t("memberReg.role.new") },
                          { value: "member", label: t("memberReg.role.member") },
                          { value: "deacon", label: t("memberReg.role.deacon") },
                          { value: "elder_woman", label: t("memberReg.role.elderWoman") },
                          { value: "elder", label: t("memberReg.role.elder") },
                          { value: "pastor", label: t("memberReg.role.pastor") },
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t("memberReg.field.baptism")}</label>
                      <CustomSelect
                        value={formData.baptism}
                        onChange={(val: string) => handleInputChange("baptism", val)}
                        options={[
                          { value: "none", label: t("memberReg.baptism.none") },
                          { value: "learning", label: t("memberReg.baptism.learning") },
                          { value: "baptism", label: t("memberReg.baptism.baptism") },
                          { value: "child_baptism", label: t("memberReg.baptism.childBaptism") },
                          { value: "confirmation", label: t("memberReg.baptism.confirmation") },
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t("memberReg.field.familyHead")}</label>
                      <MemberSelect
                        value={formData.familyHead}
                        onChange={(val: string) => handleInputChange("familyHead", val)}
                        members={members}
                        placeholder={t("memberReg.field.familyHeadPlaceholder")}
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
                    {t("memberReg.section.affiliation")}
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">{t("memberReg.field.district")}</label>
                      <CustomSelect
                        value={formData.districtId}
                        onChange={(val: string) => {
                          setFormData(prev => ({ ...prev, districtId: val, zoneId: "" }));
                        }}
                        options={[
                          { value: "", label: t("memberReg.field.selectPrompt") },
                          ...orgTree.map(group => ({ value: group.id, label: group.name }))
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t("memberReg.field.zone")}</label>
                      <CustomSelect
                        value={formData.zoneId}
                        onChange={(val: string) => handleInputChange("zoneId", val)}
                        disabled={!formData.districtId}
                        options={[
                          { value: "", label: t("memberReg.field.selectPrompt") },
                          ...(formData.districtId && orgTree.find(g => g.id === formData.districtId)?.children.map(child => ({ value: child.id, label: child.name })) || [])
                        ]}
                      />
                    </div>

                    <div className="form-group form-group--full">
                      <label className="form-label">{t("memberReg.field.memo")}</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder={t("memberReg.field.memoPlaceholder")}
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
                {t("common.cancel")}
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
                    {isEditMode ? t("memberReg.submit.edit") : t("memberReg.submit.new")}
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
              <h3 style={{ margin: 0 }}>{t("memberReg.addressModal.title")}</h3>
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
