import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Typography,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Menu,
  MenuItem,
  IconButton,
  InputAdornment,
  Grid,
  Select,
  FormHelperText,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useRouter } from "next/router";
import Head from "next/head";
import { PiPencil } from "react-icons/pi";
import { CgMoreVertical } from "react-icons/cg";
import { CheckOutlined, Close, PeopleOutline } from "@mui/icons-material";
import { FiInfo, FiSave, FiTrash2, FiX } from "react-icons/fi";
import EditIcon from "@mui/icons-material/Edit"; // Ikon untuk Update Patient
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  showAddToast,
  showDeleteToast,
  showErrorToast,
  showUpdateToast,
} from "@/utils/notif";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/utils/apiClient";
import DynamicDialog from "@/components/DynamicDialog";
import LoadingComponent from "@/components/LoadingComponent";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import SearchIcon from "@mui/icons-material/Search";

interface Patient {
  id: number;
  patient_code: string;
  barcode: string;
  nik: string;
  name: string;
  gender: string;
  place_of_birth: string;
  date_of_birth: string; // or Date if you parse it
  address: string;
  number_phone: string; // Note: this should be string, not number (for leading zeros)
  email: string;
}

const Patients = () => {
  const router = useRouter();
  const {
    page: queryPage = "1",
    limit: queryLimit = "10",
    search: querySearch = "",
  } = router.query as { page?: string; limit?: string; search?: string };

  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(querySearch);
  const [page, setPage] = useState(Number(queryPage) - 1); // 0-based indexing
  const [rowsPerPage, setRowsPerPage] = useState(Number(queryLimit));
  const [totalPatients, setTotalPatients] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [patientData, setPatientData] = useState({
    id: null,
    nik: "",
    name: "",
    gender: "",
    place_of_birth: "",
    date_of_birth: "",
    address: "",
    number_phone: "",
    email: "",
  });
  const [errors, setErrors] = useState({
    nik: "",
    name: "",
    gender: "",
    place_of_birth: "",
    date_of_birth: "",
    address: "",
    number_phone: "",
    email: "",
  });

  // const [errors, setErrors] = useState<{ [key: string]: string }>({}); // State untuk menyimpan error
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // Untuk menu dropdown
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null); // Untuk menyimpan pasien yang dipilih
  const [open, setOpen] = useState(false);

  // Function to open modal for adding a new patient
  const handleOpenAddModal = () => {
    setEditMode(false);
    setPatientData({
      id: null,
      nik: "",
      name: "",
      gender: "",
      place_of_birth: "",
      date_of_birth: "",
      address: "",
      number_phone: "",
      email: "",
    });
    setErrors({
      nik: "",
      name: "",
      gender: "",
      place_of_birth: "",
      date_of_birth: "",
      address: "",
      number_phone: "",
      email: "",
    });
    setOpenModal(true);
  };

  // Function to open modal for editing an existing patient
  const handleOpenEditModal = async (selectedPatientId: number) => {
    try {
      setEditMode(true);
      // Menggunakan fungsi getRequest yang sudah didefinisikan
      const patientData = await getRequest(
        `/api/patients/${selectedPatientId}`
      );

      if (patientData.status === "success") {
        const patient = patientData.data;

        // Format tanggal untuk input field
        // Ensure date is properly formatted for the input field
        let formattedDate = "";
        if (patient.date_of_birth) {
          // Try to parse and format the date
          try {
            const date = new Date(patient.date_of_birth);
            formattedDate = date.toISOString().split("T")[0];
          } catch (e) {
            console.error("Error formatting date:", e);
            formattedDate = patient.date_of_birth;
          }
        }

        setPatientData({
          id: patient.id,
          nik: patient.nik || "",
          name: patient.name || "",
          gender: patient.gender || "",
          place_of_birth: patient.place_of_birth || "",
          date_of_birth: formattedDate,
          address: patient.address || "",
          number_phone: patient.number_phone || "",
          email: patient.email || "",
        });

        // Reset error messages
        setErrors({
          nik: "",
          name: "",
          gender: "",
          place_of_birth: "",
          date_of_birth: "",
          address: "",
          number_phone: "",
          email: "",
        });

        setOpenModal(true);
      } else {
        showErrorToast("Failed to get patient data");
      }
    } catch (error) {
      console.error("Error retrieving patient data:", error);
      showErrorToast("An error occurred while loading patient data");
    }
  };

  // Function to validate patient data
  const validatePatientData = () => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields = [
      "nik",
      "name",
      "gender",
      "place_of_birth",
      "date_of_birth",
      "address",
      "number_phone",
      "email",
    ];

    requiredFields.forEach((field) => {
      if (!patientData[field as keyof typeof patientData]) {
        newErrors[field] = "This field is required";
      }
    });

    // Validasi NIK (16 digit dan hanya angka)
    if (
      patientData.nik &&
      (patientData.nik.length !== 16 || !/^\d+$/.test(patientData.nik))
    ) {
      newErrors.nik = "NIK must be exactly 16 digits and contain only numbers";
    }

    // Validasi nomor telepon
    if (patientData.number_phone) {
      if (!/^\d+$/.test(patientData.number_phone)) {
        newErrors.number_phone = "Phone number must contain only numbers";
      }
      // Validasi panjang hanya jika tidak dalam rentang yang benar
      else if (
        patientData.number_phone.length < 11 ||
        patientData.number_phone.length > 13
      ) {
        newErrors.number_phone =
          "Phone number must be between 11 and 13 digits";
      } else if (!patientData.number_phone.startsWith("08")) {
        newErrors.number_phone = "Invalid Phone Number, must start with '08'";
      }
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (patientData.email && !emailRegex.test(patientData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Set the errors in state
    // setErrors(newErrors: string);

    // Return true only if there are no errors
    return Object.keys(newErrors).length === 0;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Gunakan getRequest untuk melakukan GET request
      const response = await getRequest(
        "/api/patients?page=" +
          (page + 1) +
          "&limit=" +
          rowsPerPage +
          "&search=" +
          encodeURIComponent(searchTerm)
      );
      const { patients, pagination } = response.data;
      setPatientsData(patients || []);
      setTotalPatients(pagination?.totalPatients || 0);
    } catch (error) {
      console.error("Error fetching patients data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    searchTerm,
    setLoading,
    setPatientsData,
    setTotalPatients,
  ]);

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, searchTerm, fetchData]); // tambahkan fetchData ke dalam array dependensi

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setPage(0); // Reset ke halaman pertama saat pencarian berubah
    // Update URL dengan search term baru
    router.push({
      pathname: "/dashboard",
      query: {
        menu: "patients",
        page: 1,
        limit: rowsPerPage,
        search: newSearchTerm,
      },
    });
  };

  // Function add patient
  const handleAddPatient = async () => {
    if (!validatePatientData()) {
      return showErrorToast("Please fill in the data correctly.");
    }

    try {
      await postRequest("/api/patients", patientData);
      showAddToast("Patient added successfully!");
      setOpenModal(false);
      fetchData(); // Refresh data pasien
    } catch (error) {
      console.error("Error adding patient:", error);

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Something went wrong";
        showErrorToast(errorMessage);
      } else {
        showErrorToast("An unexpected error occurred");
      }
    }
  };

  // Function to update an existing patient
  const handleUpdatePatient = async () => {
    if (!validatePatientData()) {
      return; // Stop if validation fails
    }

    try {
      // Create a sanitized copy of patient data to send to the API
      const patientDataToUpdate = {
        id: patientData.id,
        nik: patientData.nik,
        name: patientData.name,
        gender: patientData.gender,
        place_of_birth: patientData.place_of_birth,
        date_of_birth: patientData.date_of_birth,
        address: patientData.address,
        number_phone: patientData.number_phone,
        email: patientData.email,
      };

      const response = await putRequest(
        `/api/patients/${patientData.id}`,
        patientDataToUpdate
      );

      if (response.status === "success") {
        showUpdateToast("Patient updated successfully");
        setOpenModal(false);
        fetchData(); // Use fetchData instead of fetchPatients for consistency
      } else {
        showErrorToast(response.message || "Failed to update patient");
      }
    } catch (error) {
      console.error("Error updating patient:", error);

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Error updating patient";
        showErrorToast(errorMessage);
      } else {
        showErrorToast("An unexpected error occurred while updating patient");
      }
    }
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    patient: Patient
  ) => {
    console.log("Selected patient for action:", patient);
    setAnchorEl(event.currentTarget);
    setSelectedPatient(patient);
  };

  const handleDeleteClick = () => {
    if (!selectedPatient) {
      console.error("No patient selected for deletion.");
      showErrorToast("Please select a patient first.");
      return;
    }

    console.log(
      "Opening delete confirmation for patient ID:",
      selectedPatient.id
    );
    setOpen(true); // Buka dialog konfirmasi
    setAnchorEl(null); // Tutup menu dropdown
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedPatient(null);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) {
      console.error("No patient selected for deletion.");
      showErrorToast("No patient selected for deletion.");
      return;
    }

    console.log("Deleting patient with ID:", selectedPatient.id);

    try {
      const response = await deleteRequest(
        `/api/patients/${selectedPatient.id}`
      );
      if (response.status === "success") {
        showDeleteToast("Patient deleted successfully!");
        fetchData(); // Refresh data pasien
      } else {
        console.error("Failed to delete patient. Response:", response);
        showErrorToast(response.message || "Failed to delete patient");
      }
    } catch (error) {
      console.error("Error deleting patient:", error);
      showErrorToast("An unexpected error occurred");
    } finally {
      setOpen(false); // Tutup dialog konfirmasi
    }
  };

  // Perbarui filteredPatients untuk pencarian berdasarkan patient_code, barcode, atau nik
  const filteredPatients = patientsData.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.nik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetail = () => {
    handleCloseMenu(); // Close menu after selecting Detail
    if (selectedPatient) {
      router.push(`/dashboard?menu=patients&id=${selectedPatient.id}`); // Pastikan ID pasien dikirimkan dengan benar
    }
  };

  return (
    <>
      <Head>
        <title>Patients</title>
        <link rel="icon" href="/assets/images/icon/fanscosa-icon.png" />
      </Head>

      <div className="flex justify-start gap-2">
        <PeopleOutline className="h-7 w-7 text-black" />
        <h2 className="text-xl font-semibold text-black">Patients</h2>
      </div>
      <Grid item xs={12}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Search"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearch}
            fullWidth
            margin="normal"
            sx={{ flex: 3 }}
            InputProps={{
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchTerm("")} edge="end">
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenAddModal}
            startIcon={<AddOutlinedIcon />}
            sx={{ height: 55, flex: 1, mt: 2 }}
          >
            Add New Patient
          </Button>
        </Box>
      </Grid>

      {loading ? (
        <LoadingComponent
          text="Loading Data Patients..."
          spinnerColor="#1e2dfa"
          textColor="#333"
        />
      ) : (
        <>
          <Paper>
            <TableContainer className="h-full mt-1">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      No.
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Patient Code
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      NIK
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Address
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Phone Number
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient, index) => (
                      <TableRow key={patient.id}>
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <span
                            onClick={() => {
                              handleViewDetail();
                              router.push(
                                `/dashboard?menu=patients&id=${patient.id}`
                              );
                            }}
                            className="text-blue-500 hover:underline cursor-pointer"
                          >
                            {patient.patient_code}
                          </span>
                        </TableCell>
                        <TableCell>{patient.nik}</TableCell>
                        <TableCell>{patient.name}</TableCell>
                        <TableCell>{patient.address}</TableCell>
                        <TableCell>{patient.number_phone}</TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleMenuClick(e, patient)}
                          >
                            <CgMoreVertical />
                          </IconButton>
                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(
                              anchorEl && selectedPatient?.id === patient.id
                            )}
                            onClose={handleCloseMenu}
                          >
                            <MenuItem
                              onClick={() => {
                                handleViewDetail();
                                handleCloseMenu(); // Menutup menu setelah klik
                              }}
                              className="flex items-center"
                            >
                              <FiInfo className="mr-2" /> Detail
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                handleOpenEditModal(patient.id);
                                handleCloseMenu(); // Close menu after clicking
                              }}
                              className="flex items-center"
                            >
                              <PiPencil className="mr-2" /> Edit
                            </MenuItem>

                            <MenuItem
                              onClick={handleDeleteClick}
                              className="flex items-center"
                            >
                              <FiTrash2 className="mr-2" /> Delete
                            </MenuItem>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "#6B7280",
                          }}
                        >
                          <SearchIcon
                            sx={{ fontSize: 40, color: "#9CA3AF", mb: 1 }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            No data available
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            Try adjusting your search or filter to find what
                            youre looking for
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between", // Menyusun elemen di kiri dan kanan
                alignItems: "center", // Memastikan elemen vertikal rata tengah
                padding: "16px", // Padding untuk memberikan ruang
                borderTop: "1px solid #ddd", // Garis pemisah antara tabel dan pagination
                backgroundColor: "#fafafa", // Latar belakang abu-abu muda
              }}
            >
              {/* Informasi Jumlah Data */}
              <Typography
                variant="body2"
                sx={{
                  color: "#555", // Warna teks abu-abu gelap
                  fontWeight: "bold", // Font tebal
                }}
              >
                Showing {page * rowsPerPage + 1} -{" "}
                {Math.min((page + 1) * rowsPerPage, totalPatients)} of{" "}
                {totalPatients} results
              </Typography>

              {/* Pagination */}
              <TablePagination
                count={totalPatients}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0); // Reset ke halaman pertama saat rows per page berubah
                }}
                rowsPerPageOptions={[10, 25, 50, 100]} // Opsi jumlah baris per halaman
                labelRowsPerPage={
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#555", // Warna teks abu-abu gelap
                      fontWeight: "bold", // Font tebal
                    }}
                  >
                    Rows per page:
                  </Typography>
                }
                sx={{
                  "& .MuiTablePagination-toolbar": {
                    minHeight: "48px", // Mengatur tinggi toolbar
                    padding: "0 16px", // Padding di dalam toolbar
                  },
                  "& .MuiTablePagination-selectLabel": {
                    color: "#555", // Warna teks abu-abu gelap
                    fontWeight: "bold", // Font tebal
                  },
                  "& .MuiTablePagination-select": {
                    color: "#333", // Warna teks hitam pekat
                    fontWeight: "bold", // Font tebal
                  },
                  "& .MuiTablePagination-actions button": {
                    color: "#0055ff", // Warna ikon pagination orange
                    "&:hover": {
                      backgroundColor: "rgba(0, 136, 255, 0.1)", // Efek hover lembut
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </>
      )}

      {/* Dialog Konfirmasi Delete Patient */}
      <DynamicDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDeletePatient}
        title="Delete Confirmation"
        message="Are you sure you want to delete this item?"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        iconNotif={<FiTrash2 className="w-7 h-7 text-red-600" />}
        iconButton={<CheckOutlined className="w-10 h-10 text-red-600" />}
        confirmButtonColor="error"
      />

      {/* Modal untuk menambahkan atau memperbarui pasien */}
      <Dialog
        open={openModal}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            setOpenModal(false); // Hanya tutup dialog jika bukan karena klik di luar modal
          }
        }}
        maxWidth="sm"
        fullWidth
        // Menonaktifkan penutupan dialog saat menekan tombol Escape
        PaperProps={{
          style: {
            borderRadius: 16,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "primary.main",
            textAlign: "center",
            borderBottom: "1px solid #e0e0e0",
            pb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Kotak untuk mengelompokkan ikon dan teks */}
          <Box display="flex" alignItems="center" gap={1}>
            {/* Kondisional untuk memilih ikon */}
            {editMode ? (
              <EditIcon color="primary" />
            ) : (
              <PersonAddIcon color="primary" />
            )}
            {/* Judul dialog */}
            <Typography variant="h6">
              {editMode ? "Update Patient" : "Add New Patient"}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: 3,
            px: 3,
          }}
        >
          <TextField
            label="NIK"
            variant="outlined"
            fullWidth
            value={patientData.nik}
            sx={{
              marginTop: 2,
            }}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value) && value.length <= 16) {
                setPatientData({ ...patientData, nik: value });
              }
            }}
            onBlur={() => {
              if (patientData.nik.length !== 16) {
                setErrors((prev) => ({
                  ...prev,
                  nik: "NIK must be 16 digits",
                }));
              } else {
                setErrors((prev) => ({ ...prev, nik: "" }));
              }
            }}
            error={!!errors.nik}
            helperText={errors.nik}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            value={patientData.name}
            onChange={(e) =>
              setPatientData({ ...patientData, name: e.target.value })
            }
            error={!!errors.name}
            helperText={errors.name}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />

          <FormControl fullWidth sx={{ height: 55 }}>
              <InputLabel id="select-gender-label">Select Gender</InputLabel>
              <Select
                labelId="select-gender-label"
                label="Select Gender"
                variant="outlined"
                id="select-gender"
                value={patientData.gender || ""}
                onChange={(e) =>
                  setPatientData({ ...patientData, gender: e.target.value })
                }
                error={!!errors.gender}
                // displayEmpty
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="Laki-Laki">Laki-Laki</MenuItem>
                <MenuItem value="Perempuan">Perempuan</MenuItem>
              </Select>
            </FormControl>

          <FormHelperText error={!!errors.gender}>
            {errors.gender}
          </FormHelperText>

          <TextField
            label="Place of Birth"
            variant="outlined"
            fullWidth
            value={patientData.place_of_birth}
            onChange={(e) =>
              setPatientData({ ...patientData, place_of_birth: e.target.value })
            }
            error={!!errors.place_of_birth}
            helperText={errors.place_of_birth}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
          <TextField
            label="Date of Birth"
            variant="outlined"
            fullWidth
            type="date"
            value={patientData.date_of_birth || ""}
            onChange={(e) =>
              setPatientData({ ...patientData, date_of_birth: e.target.value })
            }
            error={!!errors.date_of_birth}
            helperText={errors.date_of_birth}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
          <TextField
            label="Address"
            variant="outlined"
            fullWidth
            value={patientData.address}
            onChange={(e) =>
              setPatientData({ ...patientData, address: e.target.value })
            }
            error={!!errors.address}
            helperText={errors.address}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
          <TextField
            label="Phone Number"
            variant="outlined"
            fullWidth
            value={patientData.number_phone}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value) && value.length <= 13) {
                setPatientData({ ...patientData, number_phone: value });
              }
            }}
            onBlur={() => {
              const { number_phone } = patientData;
              let errorMessage = "";
              if (number_phone.length < 11 || number_phone.length > 13) {
                errorMessage = "Phone number must be between 11 and 13 digits";
              } else if (!number_phone.startsWith("08")) {
                errorMessage = "Invalid Phone Number, must start with '08'";
              }
              setErrors((prev) => ({ ...prev, number_phone: errorMessage }));
            }}
            error={!!errors.number_phone}
            helperText={errors.number_phone}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={patientData.email}
            onChange={(e) =>
              setPatientData({ ...patientData, email: e.target.value })
            }
            onBlur={() => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (patientData.email && !emailRegex.test(patientData.email)) {
                setErrors((prev) => ({
                  ...prev,
                  email: "Invalid email format",
                }));
              } else {
                setErrors((prev) => ({ ...prev, email: "" }));
              }
            }}
            error={!!errors.email}
            helperText={errors.email}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            borderTop: "1px solid #e0e0e0",
            py: 2,
          }}
        >
          <Button
            onClick={() => setOpenModal(false)}
            variant="outlined"
            color="inherit"
            sx={{
              borderRadius: 25,
              px: 3,
              py: 1,
              color: "text.secondary",
              borderColor: "grey.300",
              "&:hover": { borderColor: "grey.400" },
            }}
            startIcon={<FiX />}
          >
            Cancel
          </Button>
          <Button
            onClick={editMode ? handleUpdatePatient : handleAddPatient}
            variant="contained"
            color="primary"
            sx={{
              borderRadius: 25,
              px: 3,
              py: 1,
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
            startIcon={<FiSave />}
          >
            {editMode ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Patients;
