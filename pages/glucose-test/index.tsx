import { useState, useCallback, useEffect } from "react";
import {
  TextField,
  CircularProgress,
  Button,
  MenuItem,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
} from "date-fns";
import Cookies from "js-cookie";
import { FaSave, FaBarcode } from "react-icons/fa";
import { DeviceHub, ArrowBack, Cast } from "@mui/icons-material";
import { FiX } from "react-icons/fi";
import BarcodeComponent from "@/components/BarcodeComponent";
import { useRouter } from "next/router";
import Head from "next/head";

interface Patient {
  id: number;
  patient_code: string;
  patient_id: number;
  nik: string;
  no_rm: string;
  name: string;
  gender: string;
  barcode?: string;
  place_of_birth: string;
  date_of_birth: string;
  address: string;
  number_phone: string;
  email: string;
  lab_number: string;
}

interface GlucoseTestData {
  date_time: string;
  patient_code: string;
  lab_number: string;
  glucos_value: string;
  unit: string;
  patient_id: string | number;
  device_name: string;
  note: string;
  metode: string;
  is_validation: number;
}

interface Device {
  id: number;
  deviceId: string;
  timestamp: string;
  status: string;
  details: string;
  deviceType: string;
}

function calculateAge(dateOfBirth: string): string {
  const birthDate = new Date(dateOfBirth);
  const currentDate = new Date();
  const years = differenceInYears(currentDate, birthDate);
  const months = differenceInMonths(currentDate, birthDate) % 12;
  const days = differenceInDays(currentDate, birthDate) % 30;

  return `${years} tahun ${months} bulan ${days} hari`;
}

export default function GlucoseTestPage() {
  const router = useRouter();
  const { lab_number } = router.query;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [manualInput, setManualInput] = useState({
    dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    glucoseValue: "",
    unit: "mg/dL",
    deviceName: "",
    note: "",
  });
  const [open, setOpen] = useState(false);
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(false);

  // Load patient data dari sessionStorage jika ada
  // Load patient data dari sessionStorage jika ada
  useEffect(() => {
    if (typeof window !== "undefined" && lab_number) {
      const loadPatientFromStorage = () => {
        try {
          setIsLoadingFromStorage(true);
          const storedData = sessionStorage.getItem("selectedPatientData");

          if (storedData) {
            const patientData = JSON.parse(storedData);
            
            // Validasi struktur data patient
            if (!patientData.id) {
              console.error("Invalid patient data: missing id", patientData);
              toast.error("Invalid patient data");
              return;
            }
            
            console.log("=== PATIENT DATA FROM STORAGE ===");
            console.log("Patient ID:", patientData.patient_id);
            console.log("Patient Code:", patientData.patient_code);
            console.log("Patient Name:", patientData.name);
            console.log("Full Patient Data:", patientData);
            console.log("================================");
            
            setSelectedPatient(patientData);
          } else {
            console.warn("No patient data found in sessionStorage");
            toast.error("No patient selected. Please select a patient first.");
          }
        } catch (error) {
          console.error("Error loading patient data:", error);
          toast.error("Failed to load patient data");
        } finally {
          setIsLoadingFromStorage(false);
        }
      };

      loadPatientFromStorage();
    }
  }, [lab_number]);

  // Fetch devices dari API
  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const token = Cookies.get("authToken");
      if (!token) {
        toast.error("No token found. Please log in again.");
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/connection-status/all-devices-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.status === "Success" && response.data?.data) {
        setDevices(response.data.data);
        console.log("Devices loaded:", response.data.data);
      } else {
        console.error("Unexpected device data format:", response.data);
        setDevices([]);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Fetch devices error:",
          error.response?.data || error.message
        );
        toast.error("Failed to fetch devices. Please try again.");
      } else {
        console.error("Unknown error fetching devices:", error);
        toast.error("An unexpected error occurred while fetching devices.");
      }
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (!selectedPatient && searchTerm) {
      const timer = setTimeout(() => {
        setSearchTerm("");
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [selectedPatient, searchTerm]);

  // Handler untuk glucose value - izinkan teks bebas
  const handleGlucoseValueChange = (value: string) => {
    setManualInput({
      ...manualInput,
      glucoseValue: value,
    });
  };

  const saveGlucoseTests = useCallback(async () => {
    // Validasi patient
    if (!selectedPatient) {
      toast.error("Please select a patient first");
      return;
    }

    // Validasi glucose value
    if (!manualInput.glucoseValue || manualInput.glucoseValue.trim() === "") {
      toast.error("Please enter glucose value");
      return;
    }

    // Validasi datetime
    if (!manualInput.dateTime) {
      toast.error("Please select date and time");
      return;
    }

    try {
      setIsSaving(true);
      const token = Cookies.get("authToken");
      
      if (!token) {
        toast.error("Authentication token is missing. Please log in again.");
        setIsSaving(false);
        return;
      }

      // Format datetime dengan benar
      const formattedDateTime = manualInput.dateTime.replace("T", " ");
      
      // Pastikan format datetime benar (YYYY-MM-DD HH:mm)
      const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      if (!dateTimeRegex.test(formattedDateTime)) {
        console.error("Invalid datetime format:", formattedDateTime);
        toast.error("Invalid date time format");
        setIsSaving(false);
        return;
      }

      console.log("=== PRE-SEND DATA CHECK ===");
      console.log("Selected Patient:", selectedPatient);
      console.log("Manual Input:", manualInput);
      console.log("Formatted DateTime:", formattedDateTime);
      console.log("==========================");

      const glucoseTest = {
        date_time: formattedDateTime,
        glucos_value: manualInput.glucoseValue.trim(),
        unit: manualInput.unit,
        patient_id: selectedPatient.patient_id  || 0,
        device_name: manualInput.deviceName || "Manual Input",
        note: manualInput.note.trim() || "",
        patient_code: selectedPatient.patient_code || "",
        lab_number: Array.isArray(selectedPatient.lab_number) 
          ? selectedPatient.lab_number[0] 
          : (selectedPatient.lab_number || ""),
        metode: "Elektrokimia",
        is_validation: 0
      };

      console.log("=== PAYLOAD TO SEND ===");
      console.log(JSON.stringify(glucoseTest, null, 2));
      console.log("======================");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test-glucosa`,
        glucoseTest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Save response:", response.data);

      toast.success("Glucose test result saved successfully");
      
      // Reset form
      setManualInput({
        dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        glucoseValue: "",
        unit: "mg/dL",
        deviceName: "",
        note: "",
      });

      // Clear storage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("selectedPatientData");
      }

      // Navigate back
      setTimeout(() => {
        router.push("dashboard?menu=results&page=1&limit=10&search=");
      }, 1000);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("=== DETAILED ERROR LOG ===");
        console.error("Status:", error.response?.status);
        console.error("Status Text:", error.response?.statusText);
        console.error("Response Data:", error.response?.data);
        console.error("Request Data:", error.config?.data);
        console.error("Request URL:", error.config?.url);
        console.error("Request Headers:", error.config?.headers);
        console.error("Error Message:", error.message);
        console.error("========================");

        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           error.response?.data?.data?.error ||
                           "Failed to save glucose test results";

        if (error.response?.status === 400) {
          toast.error(`Invalid data: ${errorMessage}`);
        } else if (error.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        } else if (error.response?.status === 403) {
          toast.error("You are not authorized to perform this action.");
        } else if (error.response?.status === 500) {
          toast.error(`Server error: ${errorMessage}`);
        } else {
          toast.error(errorMessage);
        }
      } else {
        console.error("Unknown error:", error);
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [manualInput, selectedPatient, router]);

  const handleBackToLabOrders = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("selectedPatientData");
    }
    router.push("/dashboard?menu=lab_orders&page=1&limit=10&search=");
  };

  if (isLoadingFromStorage) {
    return (
      <>
        <Head>
          <title>Loading Glucose Test...</title>
        </Head>
        <div className="flex justify-center items-center h-screen">
          <CircularProgress />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Glucose Test - Lab Number: {lab_number}</title>
        <link rel="icon" href="/assets/images/icon/fanscosa-icon.png" />
      </Head>

      <div className="flex justify-between items-center space-x-2">
        <div className="flex justify-start items-center gap-2">
          <Cast className="h-7 w-7 text-black" />
          <h2 className="text-xl font-semibold text-black">Offline</h2>
        </div>
      </div>

      <Paper elevation={3} sx={{ p: 2, mt: 3, mb: 3 }}>
        <div className="container mx-auto p-6">
          {lab_number && (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleBackToLabOrders}
              sx={{ mb: 3 }}
            >
              Back to Lab Orders
            </Button>
          )}

          {lab_number && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Lab Number:</strong> {lab_number}
              </p>
            </div>
          )}

          <div className="mb-6 space-y-4 mt-7">
            {selectedPatient && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-black">
                      {selectedPatient.name} ({selectedPatient.patient_code})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-medium text-black">
                      {selectedPatient.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">NIK</p>
                    <p className="font-medium text-black">
                      {selectedPatient.nik}
                    </p>
                  </div>
                  {selectedPatient.barcode && (
                    <div>
                      <p className="text-md font-semibold text-black">
                        Barcode
                      </p>
                      <div className="flex items-center space-x-2">
                        <IconButton onClick={() => setOpen(true)}>
                          <FaBarcode className="w-5 h-5 text-black" />
                        </IconButton>
                      </div>

                      <Dialog
                        open={open}
                        onClose={() => setOpen(false)}
                        maxWidth="xs"
                        fullWidth
                      >
                        <DialogTitle className="flex justify-between items-center">
                          <span>Barcode Pasien</span>
                          <IconButton onClick={() => setOpen(false)}>
                            <FiX className="w-5 h-5 text-gray-700" />
                          </IconButton>
                        </DialogTitle>
                        <DialogContent>
                          <div className="flex justify-center p-4">
                            {(selectedPatient.no_rm ||
                              selectedPatient.barcode) && (
                              <BarcodeComponent
                                value={
                                  selectedPatient.no_rm ||
                                  selectedPatient.barcode
                                }
                              />
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Place of Birth</p>
                    <p className="font-medium text-black">
                      {selectedPatient.place_of_birth}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium text-black">
                      {new Date(
                        selectedPatient.date_of_birth
                      ).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-black">
                      {selectedPatient.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium text-black">
                      {selectedPatient.number_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-black">
                      {selectedPatient.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-medium text-black">
                      {calculateAge(selectedPatient.date_of_birth)}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-start items-center gap-2 mb-2">
                    <DeviceHub className="h-5 w-5 text-black" />
                    <h2 className="text-xl font-semibold text-black">
                      Input Glucose Reading
                    </h2>
                  </div>
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        label="Date & Time"
                        type="datetime-local"
                        variant="outlined"
                        fullWidth
                        required
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={manualInput.dateTime}
                        onChange={(e) =>
                          setManualInput({
                            ...manualInput,
                            dateTime: e.target.value,
                          })
                        }
                      />
                      <TextField
                        label="Glucose Value"
                        type="text"
                        variant="outlined"
                        fullWidth
                        required
                        placeholder="e.g., 120 or Low/High"
                        value={manualInput.glucoseValue}
                        onChange={(e) => handleGlucoseValueChange(e.target.value)}
                        helperText="Enter numeric or text value"
                      />
                      <TextField
                        select
                        label="Unit"
                        variant="outlined"
                        fullWidth
                        required
                        value={manualInput.unit}
                        onChange={(e) =>
                          setManualInput({
                            ...manualInput,
                            unit: e.target.value,
                          })
                        }
                      >
                        <MenuItem value="mg/dL">mg/dL</MenuItem>
                        <MenuItem value="mmol/L">mmol/L</MenuItem>
                      </TextField>

                      <TextField
                        select
                        label="Device Name"
                        variant="outlined"
                        fullWidth
                        value={manualInput.deviceName}
                        onChange={(e) =>
                          setManualInput({
                            ...manualInput,
                            deviceName: e.target.value,
                          })
                        }
                        disabled={loadingDevices}
                        helperText={loadingDevices ? "Loading devices..." : "Optional"}
                      >
                        <MenuItem value="">
                          <em>Manual Input</em>
                        </MenuItem>
                        {devices.map((device) => (
                          <MenuItem key={device.id} value={device.deviceType}>
                            {device.deviceType} ({device.deviceId})
                          </MenuItem>
                        ))}
                      </TextField>
                    </div>
                    <div className="grid mt-3">
                      <TextField
                        label="Notes"
                        variant="outlined"
                        fullWidth
                        placeholder="Optional notes"
                        multiline
                        rows={4}
                        value={manualInput.note}
                        onChange={(e) =>
                          setManualInput({
                            ...manualInput,
                            note: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4 gap-2">
                  {lab_number && (
                    <Button variant="outlined" onClick={handleBackToLabOrders}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<FaSave />}
                    onClick={saveGlucoseTests}
                    disabled={isSaving || !manualInput.glucoseValue}
                  >
                    {isSaving ? "Saving..." : "Save Glucose Test"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Paper>
    </>
  );
}