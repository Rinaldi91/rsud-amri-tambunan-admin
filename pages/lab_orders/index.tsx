import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/id";
import type { SelectChangeEvent } from "@mui/material/Select";

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
  MenuItem,
  IconButton,
  InputAdornment,
  Grid,
  Select,
  FormHelperText,
  FormControl,
  InputLabel,
  Autocomplete,
  Divider,
  Alert,
  Modal,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  // Menu,
  Chip,
} from "@mui/material";
import { useRouter } from "next/router";
import Head from "next/head";
import Cookies from "js-cookie";
import Close from "@mui/icons-material/Close";
// import CheckOutlined from "@mui/icons-material/CheckOutlined";
// import MoreVert from "@mui/icons-material/MoreVert";
import { FiSave, FiTrash2, FiX, FiSearch, FiEye, FiEdit } from "react-icons/fi";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import ScienceIcon from "@mui/icons-material/Science";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import CachedOutlinedIcon from "@mui/icons-material/CachedOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  showAddToast,
  // showDeleteToast,
  showErrorToast,
  showUpdateToast,
} from "@/utils/notif";
import {
  // deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/utils/apiClient";
// import DynamicDialog from "@/components/DynamicDialog";
import LoadingComponent from "@/components/LoadingComponent";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

interface LabOrder {
  id: number;
  patient_code: string;
  patient_id: number;
  no_rm: string;
  no_registrasi: string;
  referral_doctor: string;
  lab_number: string;
  barcode: string;
  room: string;
  nik: string;
  name: string;
  gender: string;
  note: string | null;
  place_of_birth: string;
  date_of_birth: string;
  address: string;
  number_phone: string | null;
  email: string | null;
  status: string;
  is_order: number;
  created_at: string;
  updated_at: string;
}

interface Patient {
  id: number;
  no_rm: string;
  nik: string;
  name: string;
  gender: string;
  place_of_birth: string;
  date_of_birth: string;
  address: string;
  number_phone: string | null;
  email: string | null;
}

const LabOrders = () => {
  const router = useRouter();
  const {
    page: queryPage = "1",
    limit: queryLimit = "10",
    search: querySearch = "",
    is_order: queryIsOrder = "",
    room: queryRoom = "",
  } = router.query as {
    page?: string;
    limit?: string;
    search?: string;
    is_order?: string;
    room?: string;
  };

  const [labOrdersData, setLabOrdersData] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(querySearch);
  const [page, setPage] = useState(Number(queryPage) - 1);
  const [rowsPerPage, setRowsPerPage] = useState(Number(queryLimit));
  const [totalLabOrders, setTotalLabOrders] = useState(0);
  const [totalFilteredLabOrders, setTotalFilteredLabOrders] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Filter states
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateFilterType, setDateFilterType] = useState<"single" | "range">(
    "single"
  );
  const [orderStatus, setOrderStatus] = useState<string>(queryIsOrder);
  const [selectedRoom, setSelectedRoom] = useState<string>(queryRoom);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);

  // Patient search states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);

  // Detail modal states
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail] = useState(false);

  // Lab order form data
  const [labOrderData, setLabOrderData] = useState({
    id: null,
    no_rm: "",
    no_registrasi: "",
    referral_doctor: "",
    lab_number: "",
    room: "",
    nik: "",
    name: "",
    gender: "",
    place_of_birth: "",
    date_of_birth: "",
    address: "",
    number_phone: "",
    email: "",
  });

  // Form validation errors
  const [errors, setErrors] = useState({
    no_rm: "",
    no_registrasi: "",
    referral_doctor: "",
    lab_number: "",
    room: "",
    nik: "",
    name: "",
    gender: "",
    place_of_birth: "",
    date_of_birth: "",
    address: "",
    number_phone: "",
    email: "",
  });

  // Menu and dialog states
  // const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // const [selectedLabOrder, setSelectedLabOrder] = useState<LabOrder | null>(
  //   null
  // );
  const [open, setOpen] = useState(false);

  // Helper function to update query parameters
  const updateQueryParams = (newParams: Record<string, string>) => {
    const query: Record<string, string | string[] | undefined> = {
      ...router.query,
      ...newParams,
    };

    // Remove empty parameters
    Object.keys(query).forEach((key) => {
      const typedKey = key as keyof typeof query;
      if (query[typedKey] === "" || query[typedKey] === undefined) {
        delete query[typedKey];
      }
    });

    router.push(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  };

  // Function to fetch available rooms
  const fetchAvailableRooms = useCallback(async () => {
    try {
      const token = Cookies.get("authToken");
      if (!token) {
        console.error("Authentication token is missing");
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/available-rooms`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.status === "success" && response.data?.data?.rooms) {
        setAvailableRooms(response.data.data.rooms);
      } else {
        console.error("Unexpected rooms data format:", response.data);
        setAvailableRooms([]);
      }
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      if (axios.isAxiosError(error)) {
        switch (error.response?.status) {
          case 403:
            showErrorToast("You are not authorized to access room data.");
            break;
          case 500:
            showErrorToast(
              "Server error while fetching rooms. Please try again later."
            );
            break;
          default:
            showErrorToast(
              "Failed to fetch available rooms. Please try again."
            );
        }
      } else {
        showErrorToast("An unexpected error occurred while fetching rooms.");
      }
      setAvailableRooms([]);
    }
  }, []);

  // Function to search patients
  const searchPatients = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setPatients([]);
      return;
    }

    try {
      setPatientSearchLoading(true);

      const token = Cookies.get("authToken");
      if (!token) {
        showErrorToast("Authentication token is missing. Please log in again.");
        return;
      }

      const response = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_BASE_URL
        }/api/patients?page=1&limit=10&search=${encodeURIComponent(
          searchQuery
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.data?.patients) {
        setPatients(response.data.data.patients);
      } else {
        console.error("Unexpected data format:", response.data);
        setPatients([]);
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      if (axios.isAxiosError(error)) {
        switch (error.response?.status) {
          case 400:
            showErrorToast("Invalid search parameters.");
            break;
          case 403:
            showErrorToast("You are not authorized to search patients.");
            break;
          case 500:
            showErrorToast("Server error. Please try again later.");
            break;
          default:
            showErrorToast("Failed to search patients. Please try again.");
        }
      } else {
        showErrorToast("An unexpected error occurred while searching.");
      }
      setPatients([]);
    } finally {
      setPatientSearchLoading(false);
    }
  }, []);

  // Effect for patient search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (
        patientSearchTerm &&
        isSearchingPatient &&
        patientSearchTerm.length >= 3
      ) {
        searchPatients(patientSearchTerm);
      } else if (patientSearchTerm.length < 3) {
        setPatients([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [patientSearchTerm, isSearchingPatient, searchPatients]);

  // Fetch available rooms on component mount
  useEffect(() => {
    fetchAvailableRooms();
  }, [fetchAvailableRooms]);

  // Fetch lab orders data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append("page", (page + 1).toString());
      queryParams.append("limit", rowsPerPage.toString());

      if (searchTerm) {
        queryParams.append("search", searchTerm);
      }

      // Date filtering
      if (dateFilterType === "single" && selectedDate) {
        queryParams.append("date", selectedDate.format("DD-MM-YYYY"));
      } else if (dateFilterType === "range" && startDate && endDate) {
        queryParams.append("start_date", startDate.format("DD-MM-YYYY"));
        queryParams.append("end_date", endDate.format("DD-MM-YYYY"));
      }

      // Order status filtering
      if (orderStatus) {
        queryParams.append("is_order", orderStatus);
      }

      // Room filtering
      if (selectedRoom) {
        queryParams.append("room", selectedRoom);
      }

      const response = await getRequest(
        `/v1/bridging/mapping-patient?${queryParams.toString()}`
      );

      const { mappingPatients, pagination } = response.data;
      setLabOrdersData(mappingPatients || []);

      const isSearching =
        searchTerm.trim().length > 0 ||
        selectedDate ||
        (startDate && endDate) ||
        orderStatus ||
        selectedRoom;

      const totalAll = pagination.totalPatients ?? pagination.total ?? 0;
      const totalFiltered =
        pagination.totalFiltered ??
        pagination.totalSearch ??
        pagination.filtered ??
        mappingPatients.length;

      setTotalLabOrders(totalAll);
      setTotalFilteredLabOrders(isSearching ? totalFiltered : totalAll);
    } catch (error) {
      console.error("Error fetching lab orders data:", error);
      showErrorToast("Failed to fetch lab orders data");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    searchTerm,
    selectedDate,
    startDate,
    endDate,
    orderStatus,
    selectedRoom,
    dateFilterType,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Event handlers
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setPage(0);
    updateQueryParams({ search: newSearchTerm, page: "1" });
  };

  const handleOrderStatusChange = (event: SelectChangeEvent<string>) => {
    const newOrderStatus = event.target.value as string;
    setOrderStatus(newOrderStatus);
    setPage(0);
    updateQueryParams({ is_order: newOrderStatus, page: "1" });
  };

  const handleRoomChange = (event: SelectChangeEvent<string>) => {
    const newRoom = event.target.value as string;
    setSelectedRoom(newRoom);
    setPage(0);
    updateQueryParams({ room: newRoom, page: "1" });
  };

  const handleDateChange = (newDate: Dayjs | null) => {
    setSelectedDate(newDate);
    setPage(0);
  };

  const handleStartDateChange = (newDate: Dayjs | null) => {
    setStartDate(newDate);
    setPage(0);
  };

  const handleEndDateChange = (newDate: Dayjs | null) => {
    setEndDate(newDate);
    setPage(0);
  };

  const handleDateFilterTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDateFilterType(event.target.value as "single" | "range");
    // Reset dates when changing filter type
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
    setOrderStatus("");
    setSelectedRoom("");
    setDateFilterType("single");
    setPage(0);

    updateQueryParams({
      page: "1",
      limit: rowsPerPage.toString(),
      search: "",
      is_order: "",
      room: "",
    });

    fetchData();
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Patient selection functions
  const handleSelectPatient = (patient: Patient | null) => {
    if (patient) {
      let formattedDate = "";
      if (patient.date_of_birth) {
        try {
          const date = new Date(patient.date_of_birth);
          formattedDate = date.toISOString().split("T")[0];
        } catch (e) {
          console.error("Error formatting date:", e);
          formattedDate = patient.date_of_birth;
        }
      }

      setLabOrderData((prev) => ({
        ...prev,
        no_rm: patient.no_rm || "",
        nik: patient.nik || "",
        name: patient.name || "",
        gender: patient.gender || "",
        place_of_birth: patient.place_of_birth || "",
        date_of_birth: formattedDate,
        address: patient.address || "",
        number_phone: patient.number_phone || "",
        email: patient.email || "",
      }));

      setSelectedPatient(patient);
      setShowNewPatientForm(false);

      // Reset errors for patient fields
      setErrors((prev) => ({
        ...prev,
        no_rm: "",
        nik: "",
        name: "",
        gender: "",
        place_of_birth: "",
        date_of_birth: "",
        address: "",
        number_phone: "",
        email: "",
      }));
    }
  };

  const resetPatientData = () => {
    setLabOrderData((prev) => ({
      ...prev,
      no_rm: "",
      nik: "",
      name: "",
      gender: "",
      place_of_birth: "",
      date_of_birth: "",
      address: "",
      number_phone: "",
      email: "",
    }));
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setShowNewPatientForm(true);
  };

  // Validation function
  const validateLabOrderData = () => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields = [
      "no_registrasi",
      "referral_doctor",
      "lab_number",
      "room",
    ];

    requiredFields.forEach((field) => {
      if (!labOrderData[field as keyof typeof labOrderData]) {
        newErrors[field] = "This field is required";
      }
    });

    const patientRequiredFields = [
      "no_rm",
      "nik",
      "name",
      "gender",
      "place_of_birth",
      "date_of_birth",
      "address",
    ];

    patientRequiredFields.forEach((field) => {
      if (!labOrderData[field as keyof typeof labOrderData]) {
        newErrors[field] = "This field is required";
      }
    });

    if (labOrderData.nik) {
      if (labOrderData.nik.length !== 16 || !/^\d+$/.test(labOrderData.nik)) {
        newErrors.nik =
          "NIK must be exactly 16 digits and contain only numbers";
      }
    }

    if (labOrderData.number_phone) {
      if (!/^\d+$/.test(labOrderData.number_phone)) {
        newErrors.number_phone = "Phone number must contain only numbers";
      } else if (
        labOrderData.number_phone.length < 11 ||
        labOrderData.number_phone.length > 13
      ) {
        newErrors.number_phone =
          "Phone number must be between 11 and 13 digits";
      } else if (!labOrderData.number_phone.startsWith("08")) {
        newErrors.number_phone = "Invalid Phone Number, must start with '08'";
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (labOrderData.email && !emailRegex.test(labOrderData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors({
      no_rm: newErrors.no_rm || "",
      no_registrasi: newErrors.no_registrasi || "",
      referral_doctor: newErrors.referral_doctor || "",
      lab_number: newErrors.lab_number || "",
      room: newErrors.room || "",
      nik: newErrors.nik || "",
      name: newErrors.name || "",
      gender: newErrors.gender || "",
      place_of_birth: newErrors.place_of_birth || "",
      date_of_birth: newErrors.date_of_birth || "",
      address: newErrors.address || "",
      number_phone: newErrors.number_phone || "",
      email: newErrors.email || "",
    });
    return Object.keys(newErrors).length === 0;
  };

  // CRUD operations
  const handleAddLabOrder = async () => {
    if (!validateLabOrderData()) {
      return showErrorToast("Please fill in the data correctly.");
    }

    try {
      const labOrderPayload = {
        ...labOrderData,
        patient_id: selectedPatient?.id || null,
        is_new_patient: !selectedPatient,
      };

      await postRequest("/api/v1/bridging/mapping-patient", labOrderPayload);
      showAddToast("Lab order added successfully!");
      setOpenModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding lab order:", error);

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Something went wrong";
        showErrorToast(errorMessage);
      } else {
        showErrorToast("An unexpected error occurred");
      }
    }
  };

  const handleUpdateLabOrder = async () => {
    if (!validateLabOrderData()) {
      return;
    }

    try {
      const labOrderDataToUpdate = {
        ...labOrderData,
        patient_id: selectedPatient?.id || null,
      };

      const response = await putRequest(
        `/api/lab-orders/${labOrderData.id}`,
        labOrderDataToUpdate
      );

      if (response.status === "success") {
        showUpdateToast("Lab order updated successfully");
        setOpenModal(false);
        fetchData();
      } else {
        showErrorToast(response.message || "Failed to update lab order");
      }
    } catch (error) {
      console.error("Error updating lab order:", error);

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Error updating lab order";
        showErrorToast(errorMessage);
      } else {
        showErrorToast("An unexpected error occurred while updating lab order");
      }
    }
  };

  const handleCloseDetail = () => {
    setOpenDetailModal(false);
    setDetailData(null);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setPatients([]);
    setIsSearchingPatient(false);
    setShowNewPatientForm(false);
  };

  const filteredLabOrders = labOrdersData;

  // Tambahkan function ini setelah function-function yang sudah ada
  const handleNavigateToGlucoseTest = (labOrder: LabOrder) => {
    // Simpan data lab order ke sessionStorage untuk diambil di halaman tujuan
    const patientData = {
      id: labOrder.id,
      patient_code: labOrder.patient_code,
      patient_id: labOrder.patient_id,
      no_rm: labOrder.no_rm,
      nik: labOrder.nik,
      name: labOrder.name,
      gender: labOrder.gender,
      place_of_birth: labOrder.place_of_birth,
      date_of_birth: labOrder.date_of_birth,
      address: labOrder.address,
      number_phone: labOrder.number_phone,
      email: labOrder.email,
      lab_number: labOrder.lab_number,
      barcode: labOrder.barcode,
    };

    // Simpan ke sessionStorage (akan hilang saat browser ditutup)
    sessionStorage.setItem("selectedPatientData", JSON.stringify(patientData));

    // Navigate ke halaman glucose test dengan query parameters yang benar
    router.push({
      pathname: "/dashboard",
      query: {
        menu: "glucose-test",
        lab_number: labOrder.lab_number,
      },
    });
  };

  return (
    <>
      <Head>
        <title>Lab Orders</title>
        <link rel="icon" href="/assets/images/icon/fanscosa-icon.png" />
      </Head>

      <div className="flex justify-start gap-2">
        <ScienceIcon className="h-7 w-7 text-black" />
        <h2 className="text-xl font-semibold text-black">Lab Orders</h2>
      </div>

      {/* Search and Filter Area */}
      <Paper elevation={3} sx={{ p: 2, mt: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {/* Search Field */}
          <Grid item xs={12} md={12}>
            <TextField
              label="Search Patient Name, Lab Number, or Code"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearch}
              fullWidth
              sx={{
                "& .MuiInputBase-root": {
                  height: 55,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchTerm("")} edge="end">
                      <Close />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Order Status Filter */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ height: 55 }}>
              <InputLabel id="order-status-label">Order Status</InputLabel>
              <Select
                labelId="order-status-label"
                id="order-status"
                value={orderStatus}
                label="Order Status"
                onChange={handleOrderStatusChange}
                sx={{ height: 55 }}
              >
                <MenuItem value="">All Orders</MenuItem>
                <MenuItem value="0">Proccess</MenuItem>
                <MenuItem value="1">Completed</MenuItem>
                <MenuItem value="2">Canceled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Room Filter */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ height: 55 }}>
              <InputLabel id="room-filter-label">Filter by Room</InputLabel>
              <Select
                labelId="room-filter-label"
                id="room-filter"
                value={selectedRoom}
                label="Filter by Room"
                onChange={handleRoomChange}
                sx={{ height: 55 }}
              >
                <MenuItem value="">All Rooms</MenuItem>
                {availableRooms.map((room) => (
                  <MenuItem key={room} value={room}>
                    {room}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Filter Type */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Date Filter Type</FormLabel>
              <RadioGroup
                row
                value={dateFilterType}
                onChange={handleDateFilterTypeChange}
              >
                <FormControlLabel
                  value="single"
                  control={<Radio />}
                  label="Single Date"
                />
                <FormControlLabel
                  value="range"
                  control={<Radio />}
                  label="Date Range"
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Date Filter */}
          <Grid item xs={12} md={dateFilterType === "range" ? 6 : 12}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label={
                  dateFilterType === "single" ? "Select Date" : "Start Date"
                }
                value={dateFilterType === "single" ? selectedDate : startDate}
                onChange={
                  dateFilterType === "single"
                    ? handleDateChange
                    : handleStartDateChange
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: "outlined",
                    sx: { height: 55 },
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>

          {/* End Date (only for range) */}
          {dateFilterType === "range" && (
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      sx: { height: 55 },
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
          )}

          {/* Filter Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={resetFilters}
                startIcon={<RefreshOutlined />}
                sx={{ height: 55, flex: 1 }}
              >
                Reset Filters
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleRefresh}
                startIcon={<CachedOutlinedIcon />}
                sx={{ height: 55, flex: 1 }}
              >
                Refresh Data
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LoadingComponent
          text="Loading Lab Orders Data..."
          spinnerColor="#1e2dfa"
          textColor="#333"
        />
      ) : (
        <>
          <Paper>
            <TableContainer className="h-full mt-1">
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ backgroundColor: "#f9f9f9" }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold", color: "#333" }}
                      >
                        {searchTerm.trim() ||
                        selectedDate ||
                        (startDate && endDate) ||
                        orderStatus ||
                        selectedRoom
                          ? `Total Hasil Pencarian: ${totalFilteredLabOrders}`
                          : `Total Data Keseluruhan: ${totalLabOrders}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      No.
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Lab Number
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Patient Info
                    </TableCell>
                    <TableCell sx={{ width: "15%", fontWeight: "bold", fontSize: "16px" }}>
                      Doctor
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Room
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ width: "15%",fontWeight: "bold", fontSize: "16px" }}>
                      Order Date
                    </TableCell>
                    <TableCell sx={{ width: "15%", fontWeight: "bold", fontSize: "16px", textAlign:"left", alignItems:"center"}}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLabOrders.length > 0 ? (
                    filteredLabOrders.map((labOrder, index) => (
                      <TableRow
                        key={labOrder.id}
                        sx={{
                          backgroundColor:
                            labOrder.is_order === 1
                              ? "#fff3cd" // kuning muda
                              : labOrder.is_order === 2
                              ? "#f8d7da" // merah muda
                              : "inherit",
                          "&:hover": {
                            backgroundColor:
                              labOrder.is_order === 1
                                ? "#ffeaa7"
                                : labOrder.is_order === 2
                                ? "#f5b7b1"
                                : "#f5f5f5",
                          },
                        }}
                      >
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <span className="text-black-500">
                              {labOrder.lab_number}
                            </span>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold", color: "#333" }}
                            >
                              {labOrder.name?.toUpperCase()} ({labOrder.gender})
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: "#555" }}
                            >
                              NIK: {labOrder.nik}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: "#555" }}
                            >
                              No. RM: {labOrder.no_rm} | No. Registrasi:{" "}
                              {labOrder.no_registrasi}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>{labOrder.referral_doctor}</TableCell>
                        <TableCell>{labOrder.room?.toUpperCase()}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              labOrder.is_order === 1
                                ? "Completed"
                                : labOrder.is_order === 2
                                ? "Canceled"
                                : "Process"
                            }
                            color={
                              labOrder.is_order === 1
                                ? "success"
                                : labOrder.is_order === 2
                                ? "error"
                                : "warning"
                            }
                            size="small"
                            sx={{
                              fontWeight: "bold",
                              fontSize: "0.75rem",
                              minWidth: "90px",
                              borderRadius: "8px",
                              textTransform: "capitalize",
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          {dayjs(labOrder.created_at)
                            .locale("id")
                            .format("dddd, DD MMMM YYYY HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<ScienceIcon />}
                            onClick={() =>
                              handleNavigateToGlucoseTest(labOrder)
                            }
                            disabled={
                              labOrder.is_order === 1 || labOrder.is_order === 2
                            } // ✅ disable jika Completed atau Canceled
                            sx={{
                              borderRadius: 2,
                              textTransform: "none",
                              fontWeight: "bold",
                              alignItems: "center",
                              opacity:
                                labOrder.is_order === 1 ||
                                labOrder.is_order === 2
                                  ? 0.6
                                  : 1, // efek visual saat disable
                              cursor:
                                labOrder.is_order === 1 ||
                                labOrder.is_order === 2
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            Glucose Test
                          </Button>
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
                            you're looking for
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
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                borderTop: "1px solid #ddd",
                backgroundColor: "#fafafa",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "#555",
                  fontWeight: "bold",
                }}
              >
                Showing {page * rowsPerPage + 1} -{" "}
                {Math.min((page + 1) * rowsPerPage, totalLabOrders)} of{" "}
                {totalLabOrders} results
              </Typography>

              <TablePagination
                count={totalLabOrders}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_e, newPage) => {
                  setPage(newPage);
                  updateQueryParams({ page: (newPage + 1).toString() });
                }}
                onRowsPerPageChange={(e) => {
                  const newRowsPerPage = Number(e.target.value);
                  setRowsPerPage(newRowsPerPage);
                  setPage(0);
                  updateQueryParams({
                    limit: newRowsPerPage.toString(),
                    page: "1",
                  });
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage={
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#555",
                      fontWeight: "bold",
                    }}
                  >
                    Rows per page:
                  </Typography>
                }
                sx={{
                  "& .MuiTablePagination-toolbar": {
                    minHeight: "48px",
                    padding: "0 16px",
                  },
                  "& .MuiTablePagination-selectLabel": {
                    color: "#555",
                    fontWeight: "bold",
                  },
                  "& .MuiTablePagination-select": {
                    color: "#333",
                    fontWeight: "bold",
                  },
                  "& .MuiTablePagination-actions button": {
                    color: "#0055ff",
                    "&:hover": {
                      backgroundColor: "rgba(0, 136, 255, 0.1)",
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </>
      )}

      {/* Action Menu */}
      {/* <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            borderRadius: 8,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedLabOrder) {
              handleViewDetail(selectedLabOrder.id);
            }
            handleCloseMenu();
          }}
          sx={{ gap: 1 }}
        >
          <FiEye size={16} />
          View Detail
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedLabOrder) {
              handleOpenEditModal(selectedLabOrder.id);
            }
            handleCloseMenu();
          }}
          sx={{ gap: 1 }}
        >
          <FiEdit size={16} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{ gap: 1, color: "error.main" }}
        >
          <FiTrash2 size={16} />
          Delete
        </MenuItem>
      </Menu> */}

      {/* Delete Confirmation Dialog */}
      {/* <DynamicDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDeleteLabOrder}
        title="Delete Confirmation"
        message="Are you sure you want to delete this lab order?"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        iconNotif={<FiTrash2 className="w-7 h-7 text-red-600" />}
        iconButton={<CheckOutlined className="w-10 h-10 text-red-600" />}
        confirmButtonColor="error"
      /> */}

      {/* Add/Edit Lab Order Modal */}
      <Dialog
        open={openModal}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            handleCloseModal();
          }
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: 16,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
            maxHeight: "90vh",
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
          <Box display="flex" alignItems="center" gap={1}>
            {editMode ? (
              <EditIcon color="primary" />
            ) : (
              <ScienceIcon color="primary" />
            )}
            <Typography variant="h6">
              {editMode ? "Update Lab Order" : "Add New Lab Order"}
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
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <div className="p-3">
            {/* Patient Search/Selection Section - Only show in add mode */}
            {!editMode && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                  Patient Information
                </Typography>

                {/* Patient Search */}
                {isSearchingPatient && !selectedPatient && (
                  <Box sx={{ mb: 2 }}>
                    <Autocomplete
                      options={patients}
                      getOptionLabel={(option) =>
                        `${option.name} - ${option.no_rm} (${option.nik})`
                      }
                      loading={patientSearchLoading}
                      onInputChange={(event, newInputValue) => {
                        setPatientSearchTerm(newInputValue);
                      }}
                      onChange={(event, newValue) => {
                        handleSelectPatient(newValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search Patient by Name, No. RM, or NIK"
                          variant="outlined"
                          fullWidth
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <FiSearch className="mr-2 text-gray-400" />
                            ),
                          }}
                          helperText="Type at least 3 characters to search"
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: "bold" }}
                            >
                              {option.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary" }}
                            >
                              No. RM: {option.no_rm} | NIK: {option.nik}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      noOptionsText={
                        patientSearchTerm.length < 3
                          ? "Type at least 3 characters to search"
                          : "No patients found"
                      }
                    />

                    <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={resetPatientData}
                        sx={{ borderRadius: 8 }}
                      >
                        Add New Patient
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Selected Patient Info */}
                {selectedPatient && (
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Selected Patient:</strong>{" "}
                        {selectedPatient.name} - No. RM: {selectedPatient.no_rm}
                      </Typography>
                    </Alert>

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<FiSearch />}
                        onClick={() => {
                          setSelectedPatient(null);
                          setIsSearchingPatient(true);
                          setShowNewPatientForm(false);
                        }}
                        sx={{ borderRadius: 8 }}
                      >
                        Search Another Patient
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={resetPatientData}
                        sx={{ borderRadius: 8 }}
                      >
                        Add New Patient
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* New Patient Form */}
                {showNewPatientForm && (
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Adding new patient. Please fill in the patient
                        information below.
                      </Typography>
                    </Alert>

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<FiSearch />}
                        onClick={() => {
                          setIsSearchingPatient(true);
                          setShowNewPatientForm(false);
                        }}
                        sx={{ borderRadius: 8 }}
                      >
                        Search Existing Patient
                      </Button>
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />
              </Box>
            )}

            {/* Lab Order Form */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Lab Order Details
            </Typography>

            <Grid container spacing={2}>
              {/* Lab Order Fields */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Registration Number"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.no_registrasi}
                  onChange={(e) =>
                    setLabOrderData({
                      ...labOrderData,
                      no_registrasi: e.target.value,
                    })
                  }
                  error={!!errors.no_registrasi}
                  helperText={errors.no_registrasi}
                  InputProps={{
                    style: { borderRadius: 8 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Lab Number"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.lab_number}
                  onChange={(e) =>
                    setLabOrderData({
                      ...labOrderData,
                      lab_number: e.target.value,
                    })
                  }
                  error={!!errors.lab_number}
                  helperText={errors.lab_number}
                  InputProps={{
                    style: { borderRadius: 8 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Referral Doctor"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.referral_doctor}
                  onChange={(e) =>
                    setLabOrderData({
                      ...labOrderData,
                      referral_doctor: e.target.value,
                    })
                  }
                  error={!!errors.referral_doctor}
                  helperText={errors.referral_doctor}
                  InputProps={{
                    style: { borderRadius: 8 },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Room"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.room}
                  onChange={(e) =>
                    setLabOrderData({ ...labOrderData, room: e.target.value })
                  }
                  error={!!errors.room}
                  helperText={errors.room}
                  InputProps={{
                    style: { borderRadius: 8 },
                  }}
                />
              </Grid>

              {/* Patient Information Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                  Patient Details
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="No. RM"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.no_rm}
                  onChange={(e) =>
                    setLabOrderData({ ...labOrderData, no_rm: e.target.value })
                  }
                  error={!!errors.no_rm}
                  helperText={errors.no_rm}
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="NIK"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.nik}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 16) {
                      setLabOrderData({ ...labOrderData, nik: value });
                    }
                  }}
                  onBlur={() => {
                    if (labOrderData.nik && labOrderData.nik.length !== 16) {
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
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Patient Name"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.name}
                  onChange={(e) =>
                    setLabOrderData({ ...labOrderData, name: e.target.value })
                  }
                  error={!!errors.name}
                  helperText={errors.name}
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ height: 55 }}>
                  <InputLabel id="select-gender-label">
                    Select Gender
                  </InputLabel>
                  <Select
                    labelId="select-gender-label"
                    label="Select Gender"
                    variant="outlined"
                    id="select-gender"
                    value={labOrderData.gender || ""}
                    onChange={(e) =>
                      setLabOrderData({
                        ...labOrderData,
                        gender: e.target.value,
                      })
                    }
                    error={!!errors.gender}
                    disabled={!!selectedPatient && !editMode}
                    sx={{
                      borderRadius: 2,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    }}
                  >
                    <MenuItem value="Laki-Laki">Laki-Laki</MenuItem>
                    <MenuItem value="Perempuan">Perempuan</MenuItem>
                  </Select>
                </FormControl>
                <FormHelperText error={!!errors.gender}>
                  {errors.gender}
                </FormHelperText>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Place of Birth"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.place_of_birth}
                  onChange={(e) =>
                    setLabOrderData({
                      ...labOrderData,
                      place_of_birth: e.target.value,
                    })
                  }
                  error={!!errors.place_of_birth}
                  helperText={errors.place_of_birth}
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Date of Birth"
                  variant="outlined"
                  fullWidth
                  type="date"
                  value={labOrderData.date_of_birth || ""}
                  onChange={(e) =>
                    setLabOrderData({
                      ...labOrderData,
                      date_of_birth: e.target.value,
                    })
                  }
                  error={!!errors.date_of_birth}
                  helperText={errors.date_of_birth}
                  disabled={!!selectedPatient && !editMode}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Address"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={labOrderData.address}
                  onChange={(e) =>
                    setLabOrderData({
                      ...labOrderData,
                      address: e.target.value,
                    })
                  }
                  error={!!errors.address}
                  helperText={errors.address}
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone Number (Optional)"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.number_phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 13) {
                      setLabOrderData({ ...labOrderData, number_phone: value });
                    }
                  }}
                  onBlur={() => {
                    const { number_phone } = labOrderData;
                    if (number_phone) {
                      let errorMessage = "";
                      if (
                        number_phone.length < 11 ||
                        number_phone.length > 13
                      ) {
                        errorMessage =
                          "Phone number must be between 11 and 13 digits";
                      } else if (!number_phone.startsWith("08")) {
                        errorMessage =
                          "Invalid Phone Number, must start with '08'";
                      }
                      setErrors((prev) => ({
                        ...prev,
                        number_phone: errorMessage,
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, number_phone: "" }));
                    }
                  }}
                  error={!!errors.number_phone}
                  helperText={errors.number_phone}
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Email (Optional)"
                  variant="outlined"
                  fullWidth
                  value={labOrderData.email}
                  onChange={(e) =>
                    setLabOrderData({ ...labOrderData, email: e.target.value })
                  }
                  onBlur={() => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (
                      labOrderData.email &&
                      !emailRegex.test(labOrderData.email)
                    ) {
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
                  disabled={!!selectedPatient && !editMode}
                  InputProps={{
                    style: {
                      borderRadius: 8,
                      backgroundColor:
                        !!selectedPatient && !editMode ? "#f5f5f5" : "inherit",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </div>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            borderTop: "1px solid #e0e0e0",
            py: 2,
          }}
        >
          <Button
            onClick={handleCloseModal}
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
            onClick={editMode ? handleUpdateLabOrder : handleAddLabOrder}
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

      {/* Detail Modal */}
      <Modal open={openDetailModal} onClose={handleCloseDetail}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: "80%", md: 600 },
            maxHeight: "90vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              Lab Order Details
            </Typography>
            <IconButton onClick={handleCloseDetail} size="small">
              <Close />
            </IconButton>
          </Box>

          {loadingDetail ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <LoadingComponent
                text="Loading details..."
                spinnerColor="#1e2dfa"
                textColor="#333"
              />
            </Box>
          ) : detailData ? (
            <Box>
              {/* Lab Order Information */}
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 2, color: "primary.main" }}
              >
                Lab Order Information
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", width: "40%" }}>
                      Patient Code
                    </TableCell>
                    <TableCell>{detailData.patient_code || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Lab Number
                    </TableCell>
                    <TableCell>{detailData.lab_number || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      No. Registrasi
                    </TableCell>
                    <TableCell>{detailData.no_registrasi || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Referral Doctor
                    </TableCell>
                    <TableCell>{detailData.referral_doctor || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Room</TableCell>
                    <TableCell>{detailData.room || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Barcode</TableCell>
                    <TableCell>{detailData.barcode || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          detailData.is_order === 1 ? "Ordered" : "Not Ordered"
                        }
                        color={
                          detailData.is_order === 1 ? "success" : "warning"
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              {/* Patient Information */}
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 2, color: "primary.main" }}
              >
                Patient Information
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", width: "40%" }}>
                      No. RM
                    </TableCell>
                    <TableCell>{detailData.no_rm || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>NIK</TableCell>
                    <TableCell>{detailData.nik || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                    <TableCell>{detailData.name || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Gender</TableCell>
                    <TableCell>{detailData.gender || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Place of Birth
                    </TableCell>
                    <TableCell>{detailData.place_of_birth || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Date of Birth
                    </TableCell>
                    <TableCell>
                      {detailData.date_of_birth
                        ? dayjs(detailData.date_of_birth).format("DD MMMM YYYY")
                        : "-"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Address</TableCell>
                    <TableCell>{detailData.address || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Phone Number
                    </TableCell>
                    <TableCell>{detailData.number_phone || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                    <TableCell>{detailData.email || "-"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              {/* Timestamps */}
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 2, color: "primary.main" }}
              >
                Timestamps
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", width: "40%" }}>
                      Created At
                    </TableCell>
                    <TableCell>
                      {detailData.created_at
                        ? dayjs(detailData.created_at)
                            .locale("id")
                            .format("dddd, DD MMMM YYYY HH:mm:ss")
                        : "-"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Updated At
                    </TableCell>
                    <TableCell>
                      {detailData.updated_at
                        ? dayjs(detailData.updated_at)
                            .locale("id")
                            .format("dddd, DD MMMM YYYY HH:mm:ss")
                        : "-"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Note if exists */}
              {detailData.note && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: "bold", mb: 2, color: "primary.main" }}
                  >
                    Notes
                  </Typography>
                  <Alert severity="info">
                    <Typography variant="body2">{detailData.note}</Typography>
                  </Alert>
                </>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No data available
              </Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default LabOrders;
