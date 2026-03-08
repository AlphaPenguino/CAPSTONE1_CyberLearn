import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import PrivacyPolicyModal from "./PrivacyPolicyModal";

const PrivacyPolicyCheck = ({ children }) => {
  const { user } = useAuthStore();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    // Show privacy policy modal for students who haven't accepted it
    if (user && user.privilege === "student" && !user.privacyPolicyAccepted) {
      setShowPrivacyPolicy(true);
    }
  }, [user]);

  const handlePrivacyPolicyClose = () => {
    setShowPrivacyPolicy(false);
  };

  return (
    <>
      {children}
      <PrivacyPolicyModal
        visible={showPrivacyPolicy}
        onClose={handlePrivacyPolicyClose}
      />
    </>
  );
};

export default PrivacyPolicyCheck;
