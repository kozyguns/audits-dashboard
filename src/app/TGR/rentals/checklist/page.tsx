"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { FirearmsMaintenanceData, columns } from "./columns";
import { DataTable } from "./data-table";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import RoleBasedWrapper from "@/components/RoleBasedWrapper";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import AddFirearmForm from "@/app/TGR/gunsmithing/AddFirearmForm";

const words = "Firearms Checklist";

interface FirearmVerification {
  firearm_id: number;
  firearm_name: string;
  verified_by: string;
  verification_date: string;
  verification_time: string;
  serial_verified: boolean;
  condition_verified: boolean;
  magazine_attached: boolean;
  notes: string;
  created_at: string;
}

export default function FirearmsChecklist() {
  const [data, setData] = useState<FirearmsMaintenanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnyFirearmRentedOut, setIsAnyFirearmRentedOut] = useState(false);

  const fetchUserRoleAndUuid = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error fetching user:", userError.message);
      return;
    }

    const user = userData.user;
    setUserUuid(user?.id || "");

    try {
      const { data: roleData, error: roleError } = await supabase
        .from("employees")
        .select("role, name")
        .eq("user_uuid", user?.id)
        .single();

      if (roleError || !roleData) {
        console.error(
          "Error fetching role:",
          roleError?.message || "No role found"
        );
        return;
      }

      setUserRole(roleData.role);
      setUserName(roleData.name);
    } catch (error) {
      console.error("Unexpected error fetching role:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserRoleAndUuid();
  }, [fetchUserRoleAndUuid]);

  const fetchFirearmsMaintenanceData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data: firearmsData, error: firearmsError } = await supabase
      .from("firearms_maintenance")
      .select("*");

    if (firearmsError) {
      console.error("Error fetching initial data:", firearmsError.message);
      throw new Error(firearmsError.message);
    }

    const { data: verificationsData, error: verificationsError } =
      await supabase.from("firearm_verifications").select("*");

    if (verificationsError) {
      console.error(
        "Error fetching verification data:",
        verificationsError.message
      );
      throw new Error(verificationsError.message);
    }

    const combinedData = firearmsData.map((firearm) => {
      const latestVerification = verificationsData
        .filter((verification) => verification.firearm_id === firearm.id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

      const withGunsmith = firearm.rental_notes === "With Gunsmith";
      const currentlyRentedOut =
        firearm.rental_notes === "Currently Rented Out";
      const isVerifiedToday = latestVerification?.verification_date === today;
      const isVerified =
        latestVerification?.serial_verified &&
        latestVerification?.condition_verified &&
        latestVerification?.magazine_attached;

      return {
        ...firearm,
        notes: firearm.rental_notes,
        morning_checked:
          withGunsmith || currentlyRentedOut || !isVerifiedToday
            ? false
            : latestVerification.verification_time === "morning",
        evening_checked:
          withGunsmith || currentlyRentedOut || !isVerifiedToday
            ? false
            : latestVerification.verification_time === "evening",
        highlight: isVerified
          ? "text-green-600"
          : withGunsmith
          ? "text-amber"
          : currentlyRentedOut
          ? "text-red"
          : "",
      };
    });

    combinedData.sort((a, b) => {
      if (a.firearm_type === b.firearm_type) {
        return a.firearm_name.localeCompare(b.firearm_name);
      }
      return a.firearm_type === "handgun" ? -1 : 1;
    });

    return combinedData;
  }, []);

  const handleVerificationComplete = async (firearmId: number) => {
    try {
      // Update the rental_notes field in the database to "Verified"
      const { error } = await supabase
        .from("firearms_maintenance")
        .update({ rental_notes: "Verified" })
        .eq("id", firearmId);

      if (error) {
        console.error("Error updating rental_notes:", error.message);
        return;
      }

      // Update the local state to reflect the change
      setData((prevData) =>
        prevData.map((item) =>
          item.id === firearmId
            ? {
                ...item,
                notes: "Verified", // Set the notes to "Verified"
                highlight: "text-green-600", // Set highlight to green
                morning_checked: false,
                evening_checked: false,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Error in handleVerificationComplete:", error);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedData = await fetchFirearmsMaintenanceData();
      setData(fetchedData);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setLoading(false);
    }
  }, [fetchFirearmsMaintenanceData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "firearm_verifications" },
        (payload) => {
          const newVerification = payload.new as FirearmVerification;
          setData((prevData) =>
            prevData.map((item) =>
              item.id === newVerification.firearm_id
                ? {
                    ...item,
                    notes: newVerification.notes,
                    morning_checked:
                      newVerification.verification_time === "morning"
                        ? true
                        : item.morning_checked,
                    evening_checked:
                      newVerification.verification_time === "evening"
                        ? true
                        : item.evening_checked,
                  }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const deleteChannel = supabase
      .channel("custom-delete-channel")
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "firearms_maintenance" },
        (payload) => {
          setData((prevData) =>
            prevData.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deleteChannel);
    };
  }, []);

  const handleNotesChange = (id: number, notes: string) => {
    setData((prevData) =>
      prevData.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const handleDeleteFirearm = async (id: number) => {
    try {
      // First, delete related records from firearm_verifications
      const { error: verificationsError } = await supabase
        .from("firearm_verifications")
        .delete()
        .eq("firearm_id", id);

      if (verificationsError) {
        throw verificationsError;
      }

      // Then, delete the firearm
      const { error: firearmError } = await supabase
        .from("firearms_maintenance")
        .delete()
        .eq("id", id);

      if (firearmError) {
        throw firearmError;
      }

      setData((prevData) => prevData.filter((item) => item.id !== id)); // Update the local state
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error deleting firearm:", error.message);
      } else {
        console.error(
          "An unknown error occurred while deleting firearm:",
          error
        );
      }
    }
  };

  const handleAddFirearm = async (newFirearm: {
    firearm_type: string;
    firearm_name: string;
    last_maintenance_date: string;
    maintenance_frequency: number;
    maintenance_notes: string;
    status: string;
    assigned_to: string | null;
  }) => {
    try {
      const { data: newFirearmData, error } = await supabase
        .from("firearms_maintenance")
        .insert([newFirearm])
        .select("*");

      if (error) {
        throw error;
      }

      if (newFirearmData && newFirearmData.length > 0) {
        setData((prevData) => [...prevData, newFirearmData[0]]);
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding firearm:", error);
    }
  };

  const handleSubmitChecklist = async () => {
    const today = new Date().toISOString();

    // Ensure all firearms have notes of either "Verified" or "With Gunsmith"
    const allValid = data.every(
      (item) => item.notes === "Verified" || item.notes === "With Gunsmith"
    );

    if (!allValid) {
      toast.error(
        "All firearms must be either Verified or With Gunsmith before submitting."
      );
      return;
    }

    // Ensure no firearms are currently rented out
    const currentlyRentedOut = data.some(
      (item) => item.notes === "Currently Rented Out"
    );

    if (currentlyRentedOut) {
      toast.error(
        "There is a firearm currently rented out. You cannot submit the checklist."
      );
      return;
    }

    try {
      // Insert the firearms with rental_notes that do not contain "Verified" into the checklist_submissions table
      for (const firearm of data.filter((item) => item.notes !== "Verified")) {
        await supabase.from("checklist_submissions").insert({
          shift: "morning", // Set to a default value since the shift is no longer selected
          submitted_by: userUuid,
          submitted_by_name: userName,
          submission_date: today, // Use the current timestamp
          checklist_notes: firearm.notes,
          firearm_name: firearm.firearm_name,
        });
      }

      // Reset verifications for firearms with "Verified" status
      const firearmsToReset = data.filter((item) => item.notes === "Verified");

      for (const firearm of firearmsToReset) {
        await supabase
          .from("firearms_maintenance")
          .update({ rental_notes: "" }) // Reset rental_notes to an empty string
          .eq("id", firearm.id);
      }

      // Update in-memory state for firearms that need to be reset
      const updatedData = data.map((firearm) =>
        firearm.notes === "Verified" ? { ...firearm, notes: "" } : firearm
      );

      setData(updatedData);
      toast.success("Checklist submitted successfully.");
    } catch (error) {
      console.error("Error submitting checklist:", error);
      toast.error("Failed to submit checklist.");
    }
  };

  return (
    <RoleBasedWrapper
      allowedRoles={["user", "auditor", "admin", "super admin"]}
    >
      <div className="h-screen max-w-8xl mx-auto flex flex-col">
        <Toaster position="top-right" />
        <section className="flex-1 flex flex-col space-y-4 p-4">
          <div>
            <h2 className="text-2xl font-bold">
              <TextGenerateEffect words={words} />
            </h2>
          </div>
          <div className="flex items-center space-y-2">
            <div className="flex space-x-2">
              <Button variant="linkHover1" onClick={handleSubmitChecklist}>
                Submit Checklist
              </Button>

              {["admin", "super admin"].includes(userRole || "") && (
                <AddFirearmForm onAdd={handleAddFirearm} />
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col space-y-4">
            <div className="rounded-md border h-full flex-1 flex flex-col">
              <div className="relative w-full h-full overflow-auto">
                {loading ? (
                  <p></p>
                ) : (
                  userRole &&
                  userUuid && (
                    <>
                      <DataTable
                        columns={columns}
                        data={data.map((item) => ({
                          ...item,
                          highlight:
                            item.notes === "With Gunsmith"
                              ? "amber"
                              : item.notes === "Currently Rented Out"
                              ? "red"
                              : item.notes === "Verified"
                              ? "green-600"
                              : "", // Ensure this handles the empty string correctly
                        }))}
                        userRole={userRole}
                        userUuid={userUuid}
                        onNotesChange={handleNotesChange}
                        onVerificationComplete={fetchData}
                        onDeleteFirearm={handleDeleteFirearm}
                      />
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </RoleBasedWrapper>
  );
}
