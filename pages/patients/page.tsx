"use client";

import { useState, useCallback, useEffect } from "react";
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Button,
  MenuItem,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { debounce } from "lodash";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
} from "date-fns";
import Cookies from "js-cookie";
import { FaUser, FaSave, FaBarcode } from "react-icons/fa";
import { DeviceHub } from "@mui/icons-material";
// import QRCodeComponent from "@/components/QRCodeComponent";
import { FiX } from "react-icons/fi";
import BarcodeComponent from "@/components/BarcodeComponent";

interface Patient {
  id: string;
  patient_code: string;
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
  lab_number: [] | string[];
}

interface GlucoseTestData {
  date_time: string;
  patient_code: string;
  lab_number: string;
  glucos_value: number;
  unit: string;
  patient_id?: string;
  device_name: string;
  note: string;
}

interface GlucoseReading {
  timestamp: Date;
  glucoseValue: number;
  unit: string;
}

interface Device {
  id: number;
  deviceId: string;
  timestamp: string;
  status: string;
  details: string;
  deviceType: string;
}

interface PatientFormProps {
  glucoseReadings: GlucoseReading[];
  onGlucoseTestSaved: () => void;
}

function calculateAge(dateOfBirth: string): string {
  const birthDate = new Date(dateOfBirth);
  const currentDate = new Date();
  const years = differenceInYears(currentDate, birthDate);
  const months = differenceInMonths(currentDate, birthDate) % 12;
  const days = differenceInDays(currentDate, birthDate) % 30;

  return `${years} tahun ${months} bulan ${days} hari`;
}

const PatientForm: React.FC<PatientFormProps> = ({ onGlucoseTestSaved }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [manualInput, setManualInput] = useState({
    dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    glucoseValue: 0,
    unit: "mg/dL",
    deviceName: "",
    note: "",
  });
  const [open, setOpen] = useState(false);

  // Fetch devices from API
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

  // Load devices on component mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Tambahkan useEffect ini jika masih ada masalah dengan clearing
  useEffect(() => {
    // Force clear ketika selectedPatient di-set ke null
    if (!selectedPatient && searchTerm) {
      const timer = setTimeout(() => {
        setSearchTerm("");
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [selectedPatient, searchTerm]);

  // Search patients using axios
  const searchPatients = debounce(async (search: string) => {
    if (!search || search.length < 3) {
      setPatients([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = Cookies.get("authToken");
      if (!token) {
        toast.error("No token found. Please log in again.");
        return;
      }

      const response = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_BASE_URL
        }/api/patients?page=1&limit=10&search=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Sesuaikan dengan struktur respons
      if (response.data?.data?.patients) {
        setPatients(response.data.data.patients);
      } else {
        console.error("Unexpected data format:", response.data);
        setPatients([]);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Save error details:",
          error.response?.data || error.message
        );
        switch (error.response?.status) {
          case 400:
            toast.error("Invalid data sent to the server.");
            break;
          case 403:
            toast.error("You are not authorized to perform this action.");
            break;
          case 500:
            toast.error("Server error. Please try again later.");
            break;
          default:
            toast.error(
              "Failed to save glucose test results. Please try again."
            );
        }
      } else {
        console.error("Unknown error:", error);
        toast.error("An unexpected error occurred.");
      }
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, 500);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    setSearchTerm(value);

    // Reset selected patient when user types (if patient was selected and user is typing something different)
    if (selectedPatient && value.length > 0) {
      const expectedValue = `${selectedPatient.no_rm} - ${selectedPatient.name} (NIK: ${selectedPatient.nik})`;
      if (!expectedValue.toLowerCase().includes(value.toLowerCase())) {
        setSelectedPatient(null);
      }
    }

    if (value && value.length >= 3) {
      searchPatients(value);
    } else {
      setPatients([]);
    }
  };

  const saveGlucoseTests = useCallback(async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient first");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const token = Cookies.get("authToken");
      if (!token) {
        toast.error("Authentication token is missing. Please log in again.");
        return;
      }

      // Ambil data langsung dari manualInput
      const glucoseTest: GlucoseTestData = {
        date_time: manualInput.dateTime.replace("T", " "), // Format sesuai database
        glucos_value: manualInput.glucoseValue,
        unit: manualInput.unit,
        patient_id: selectedPatient.id,
        device_name: manualInput.deviceName || "", // Gantilah sesuai kebutuhan
        note: manualInput.note,
        patient_code: selectedPatient.patient_code,
        lab_number: selectedPatient.lab_number[0],
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test-glucosa`,
        glucoseTest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Glucose test result saved successfully");

      // Clear semua form dan state dengan urutan yang benar
      setSelectedPatient(null);
      setSearchTerm("");
      setPatients([]); // Clear options list
      setError(""); // Clear any errors
      setLoading(false); // Reset loading state

      // Force clear dengan timeout kecil untuk memastikan DOM ter-update
      setTimeout(() => {
        setSearchTerm("");
        setSelectedPatient(null);
      }, 100);

      // Reset manual input form
      setManualInput({
        dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        glucoseValue: 0,
        unit: "mg/dL",
        deviceName: "",
        note: "",
      });

      // Call callback function
      onGlucoseTestSaved();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Save error details:",
          error.response?.data || error.message
        );
        if (error.response?.status === 400) {
          toast.error("Invalid data sent to the server.");
        } else if (error.response?.status === 403) {
          toast.error("You are not authorized to perform this action.");
        } else {
          toast.error("Failed to save glucose test results. Please try again.");
        }
      } else {
        console.error("Unknown error:", error);
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [manualInput, selectedPatient, onGlucoseTestSaved]);

  return (
    <div className="mb-6 space-y-4 mt-7">
      <div className="flex justify-start items-center gap-2">
        <FaUser className="h-5 w-5 text-black" />
        <h2 className="text-xl font-semibold text-black">
          Patients Information
        </h2>
      </div>
      <Autocomplete
        value={selectedPatient}
        onChange={(_, newValue) => {
          setSelectedPatient(newValue);
          setError("");
        }}
        options={patients}
        getOptionLabel={(option) =>
          `${option.no_rm} - ${option.name} (NIK: ${option.nik})`
        }
        loading={loading}
        clearOnBlur={false}
        clearOnEscape={true}
        blurOnSelect={true}
        key={selectedPatient?.id || "empty"} // Force re-render when cleared
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Patient (min. 3 characters)"
            variant="outlined"
            onChange={handleSearchChange}
            value={searchTerm}
            fullWidth
            error={!!error}
            helperText={error || (loading ? "Searching for patients..." : "")}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={
          searchTerm.length < 3
            ? "Enter at least 3 characters"
            : "No patients found"
        }
      />

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
              <p className="font-medium text-black">{selectedPatient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">NIK</p>
              <p className="font-medium text-black">{selectedPatient.nik}</p>
            </div>
            {selectedPatient.barcode && (
              <div>
                <p className="text-md font-semibold text-black">Barcode</p>
                <div className="flex items-center space-x-2">
                  <IconButton onClick={() => setOpen(true)}>
                    <FaBarcode className="w-5 h-5 text-black" />
                  </IconButton>
                </div>

                <Dialog open={open} onClose={() => {}} maxWidth="xs" fullWidth>
                  <DialogTitle className="flex justify-between items-center">
                    <span>Barcode Pasien</span>
                    <IconButton onClick={() => setOpen(false)}>
                      <FiX className="w-5 h-5 text-gray-700" />
                    </IconButton>
                  </DialogTitle>
                  <DialogContent>
                    <div className="flex justify-center p-4">
                      {(selectedPatient.no_rm || selectedPatient.barcode) && (
                        <BarcodeComponent
                          value={
                            selectedPatient.no_rm || selectedPatient.barcode
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
                {new Date(selectedPatient.date_of_birth).toLocaleDateString(
                  "id-ID"
                )}
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
              <p className="font-medium text-black">{selectedPatient.email}</p>
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
                    type="number"
                    variant="outlined"
                    fullWidth
                    value={
                      manualInput.glucoseValue === 0
                        ? ""
                        : manualInput.glucoseValue
                    }
                    onChange={(e) =>
                      setManualInput({
                        ...manualInput,
                        glucoseValue: e.target.value
                          ? parseFloat(e.target.value)
                          : 0,
                      })
                    }
                    onFocus={(e) => {
                      if (manualInput.glucoseValue === 0) {
                        e.target.select();
                      }
                    }}
                    InputProps={{
                      inputProps: { min: 0, step: 0.1 },
                    }}
                  />
                <TextField
                  select
                  label="Unit"
                  variant="outlined"
                  fullWidth
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
                  helperText={loadingDevices ? "Loading devices..." : ""}
                >
                  <MenuItem value="">
                    <em>Select a device</em>
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
                  placeholder="Notes"
                  multiline // Ubah menjadi textarea
                  rows={4} // Atur jumlah baris sesuai kebutuhan
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

          {/* Tombol simpan */}
          <div className="flex justify-end mt-4">
            <Button
              variant="contained"
              color="primary"
              startIcon={<FaSave />}
              onClick={saveGlucoseTests}
            >
              {isSaving ? "Saving..." : "Save Glucose Tests"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PatientForm;
