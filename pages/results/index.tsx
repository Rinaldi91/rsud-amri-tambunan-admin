import { getRequest, putRequest } from "@/utils/apiClient"; // Tambahkan patchRequest untuk update
import {
  CheckCircleOutline, // Import ikon untuk validasi
  CheckOutlined,
  Close,
  ListAltOutlined,
  QuestionMarkOutlined,
  RefreshOutlined,
  SearchOutlined,
  GetApp, // Import ikon untuk export
} from "@mui/icons-material";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu, // Import Menu
  MenuItem, // Import MenuItem
  Paper,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import dayjs from "dayjs";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { showErrorToast, showSuccessToast } from "@/utils/notif";
import DynamicDialog from "@/components/DynamicDialog";
import LoadingComponent from "@/components/LoadingComponent";
import CachedOutlinedIcon from "@mui/icons-material/CachedOutlined";
import Cookies from "js-cookie"; // Import library cookies
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import { CgMoreVertical } from "react-icons/cg"; // Import ikon "more"

interface PrintResult {
  patient_room: string;
  gender: string;
  id: number;
  patient_id: number;
  patient_code: string;
  lab_number: string;
  patient_name: string;
  date_time: string;
  glucos_value: number;
  unit: string;
  device_name: string;
  metode: string;
  is_validation: number;
  created_at: string;
  updated_at: string;
  patient_created_at: string;
  note: string;
  patient_nik: string;
  patient_no_rm: string;
  patient_referral_doctor: string;
  patient_date_of_birth: string;
  patient_gender: string;
  patient_number_phone: string;
  patient_barcode: string;
  user_validation: string;
  patient_no_registrasi: string;
}

const TestResults = () => {
  const router = useRouter();
  const {
    page: queryPageResult = "1",
    limit: queryLimitResult = "10",
    search: querySearchResult = "",
    is_validation: queryValidation = "",
  } = router.query as {
    page?: string;
    limit?: string;
    search?: string;
    is_validation?: string;
  };

  const [searchTermResult, setSearchTermResult] = useState(querySearchResult);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [validationStatus, setValidationStatus] =
    useState<string>(queryValidation);
  const [rowsPerPage, setRowsPerPage] = useState(Number(queryLimitResult));
  const [page, setPage] = useState(Number(queryPageResult) - 1); // 0-based indexing
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<PrintResult[]>([]);
  const [totalGlucoseTestResult, setGlucoseTestResult] = useState(0);
  const [totalFilteredResult, setTotalFilteredResult] = useState(0); // total hasil search
  const [isExporting, setIsExporting] = useState(false); // State untuk loading export

  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);

  const fetchAvailableRooms = useCallback(async () => {
    try {
      const token = Cookies.get("authToken");
      if (!token) {
        console.error("Authentication token missing");
        return;
      }

      console.log("🔍 Fetching rooms..."); // Debug

      const response = await getRequest("/api/available-rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📦 Full Response:", response); // Debug
      console.log("📦 Response.data:", response.data); // Debug

      // ✅ FIX: Berdasarkan log, struktur adalah response.data.rooms
      if (response?.data?.rooms && Array.isArray(response.data.rooms)) {
        console.log("✅ Rooms found:", response.data.rooms);
        setAvailableRooms(response.data.rooms);
      } else {
        console.error("❌ Unexpected room data format:", response.data);
        setAvailableRooms([]);
      }
    } catch (error) {
      console.error("❌ Error fetching rooms:", error);

      setAvailableRooms([]);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRooms();
  }, [fetchAvailableRooms]);

  const handleRoomChange = (event: SelectChangeEvent<string>) => {
    const newRoom = event.target.value as string;
    setSelectedRoom(newRoom);
    setPage(0);
    updateQueryParams({ room: newRoom, page: "1" });
  };

  const [dateFilterType, setDateFilterType] = useState<"single" | "range">(
    "single"
  );
  const [userName] = useState<string | null>(null);

  // State untuk dialog konfirmasi
  const [openDialog, setOpenDialog] = useState(false);

  // State untuk menu dropdown
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedResult, setSelectedResult] = useState<PrintResult | null>(
    null
  );

  const formatDate = (dateString: string) => {
    return dayjs(dateString).locale("id").format("DD MMMM YYYY, HH:mm:ss");
  };

  const calculateAge = (birthDate: string) => {
    const dob = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years} Tahun ${months} Bulan ${days} Hari`;
  };

  // Fungsi untuk export data ke Excel
  const handleExportData = async () => {
    try {
      setIsExporting(true);

      // Validasi rentang tanggal untuk export
      if (!startDate || !endDate) {
        showErrorToast("Please select both start date and end date for export");
        return;
      }

      // Validasi bahwa start date tidak lebih besar dari end date
      if (startDate.isAfter(endDate)) {
        showErrorToast("Start date cannot be later than end date");
        return;
      }

      const queryParams = new URLSearchParams();
      queryParams.append("start_date", startDate.format("YYYY-MM-DD"));
      queryParams.append("end_date", endDate.format("YYYY-MM-DD"));
      queryParams.append("export", "true"); // Parameter untuk menandakan export

      // Tambahkan filter lain jika ada
      if (searchTermResult) {
        queryParams.append("search", searchTermResult);
      }
      if (validationStatus) {
        queryParams.append("is_validation", validationStatus);
      }

      // Buat request untuk export
      const response = await getRequest(
        `/api/test-glucosa/export?${queryParams.toString()}`,
        {
          responseType: "blob", // Penting untuk file download
        }
      );

      // Buat blob dari response
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Buat URL untuk download
      const downloadUrl = window.URL.createObjectURL(blob);

      // Buat element anchor untuk download
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Generate filename dengan tanggal
      const filename = `glucose_test_results_${startDate.format(
        "YYYY-MM-DD"
      )}_to_${endDate.format("YYYY-MM-DD")}.xlsx`;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showSuccessToast("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      showErrorToast("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Fungsi alternatif untuk export menggunakan client-side processing
  const handleExportDataClientSide = async () => {
    try {
      setIsExporting(true);

      // Validasi rentang tanggal
      if (!startDate || !endDate) {
        showErrorToast("Please select both start date and end date for export");
        return;
      }

      if (startDate.isAfter(endDate)) {
        showErrorToast("Start date cannot be later than end date");
        return;
      }

      // Fetch semua data dalam rentang tanggal
      const queryParams = new URLSearchParams();
      queryParams.append("start_date", startDate.format("YYYY-MM-DD"));
      queryParams.append("end_date", endDate.format("YYYY-MM-DD"));
      queryParams.append("limit", "10000"); // Set limit tinggi untuk mendapatkan semua data

      if (searchTermResult) {
        queryParams.append("search", searchTermResult);
      }
      if (validationStatus) {
        queryParams.append("is_validation", validationStatus);
      }

      const response = await getRequest(
        `/api/test-glucosa?${queryParams.toString()}`
      );

      const { glucosaTest = [] } = response.data;

      if (glucosaTest.length === 0) {
        showErrorToast("No data found in the selected date range");
        return;
      }

      // Convert data ke format CSV
      const csvData = convertToCSV(glucosaTest);

      // Download CSV
      downloadCSV(
        csvData,
        `glucose_test_results_${startDate.format(
          "YYYY-MM-DD"
        )}_to_${endDate.format("YYYY-MM-DD")}.csv`
      );

      showSuccessToast(`Successfully exported ${glucosaTest.length} records!`);
    } catch (error) {
      console.error("Error exporting data:", error);
      showErrorToast("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function untuk format tanggal lahir ke format Indonesia
  const formatDateOfBirth = (dateString: string) => {
    if (!dateString) return "";
    return dayjs(dateString).locale("id").format("DD MMMM YYYY");
  };

  // Helper function untuk convert data ke CSV
  const convertToCSV = (data: PrintResult[]): string => {
    const headers = [
      "No",
      "Room",
      "Patient Code",
      "Lab Number",
      "Patient Name",
      "NIK",
      "No. RM",
      "Date of Birth",
      "Gender",
      "Phone Number",
      "Referral Doctor",
      "Test Date & Time",
      "Glucose Value",
      "Unit",
      "Method",
      "Device Name",
      "Validation Status",
      "Validator",
      "Notes",
      "Created At",
      "Updated At",
    ];

    const csvContent = [
      headers.join(","),
      ...data.map((item, index) =>
        [
          index + 1,
          `"${item.patient_code || ""}"`,
          `"${item.lab_number || ""}"`,
          `"${item.patient_name || ""}"`,
          `"${item.patient_nik || ""}"`,
          `"${item.patient_no_rm || ""}"`,
          `"${formatDateOfBirth(item.patient_date_of_birth)}"`,
          `"${item.patient_gender || ""}"`,
          `"${item.patient_number_phone || ""}"`,
          `"${item.patient_referral_doctor || ""}"`,
          `"${item.patient_room || ""}"`,
          `"${formatDate(item.date_time)}"`,
          item.glucos_value,
          `"${item.unit || ""}"`,
          `"${item.metode || ""}"`,
          `"${item.device_name || ""}"`,
          item.is_validation === 1 ? "Validated" : "Not Validated",
          `"${item.user_validation || ""}"`,
          `"${item.note || ""}"`,
          `"${formatDate(item.created_at)}"`,
          `"${formatDate(item.updated_at)}"`,
        ].join(",")
      ),
    ].join("\n");

    return csvContent;
  };

  // Helper function untuk download CSV
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const fetchDataGlucose = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append("page", (page + 1).toString());
      queryParams.append("limit", rowsPerPage.toString());

      if (searchTermResult) {
        queryParams.append("search", searchTermResult);
      }
      if (dateFilterType === "single" && selectedDate) {
        queryParams.append("date_time", selectedDate.format("YYYY-MM-DD"));
      } else if (dateFilterType === "range" && startDate && endDate) {
        queryParams.append("start_date", startDate.format("YYYY-MM-DD"));
        queryParams.append("end_date", endDate.format("YYYY-MM-DD"));
      }
      if (validationStatus) {
        queryParams.append("is_validation", validationStatus);
      }

      // Perbaikan: pastikan selectedRoom dikirim dengan benar
      if (selectedRoom) {
        queryParams.append("room", selectedRoom);
        console.log("Filtering by room:", selectedRoom); // Debug log
      }

      const response = await getRequest(
        `/api/test-glucosa?${queryParams.toString()}`
      );
      const { glucosaTest = [], pagination = {} } = response.data;

      setResultData(glucosaTest);

      // simpan total keseluruhan & hasil filter
      setGlucoseTestResult(pagination.totalTestPatients ?? 0);
      setTotalFilteredResult(
        pagination.totalFiltered ??
          pagination.totalSearch ??
          pagination.filtered ??
          glucosaTest.length
      );
    } catch (error) {
      console.error("Error fetching results data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    searchTermResult,
    selectedDate,
    startDate,
    endDate,
    validationStatus,
    dateFilterType,
    selectedRoom, // ✅ PENTING: Tambahkan ini ke dependency array
  ]);

  useEffect(() => {
    fetchDataGlucose();
  }, [fetchDataGlucose]);

  const handleRefresh = () => {
    fetchDataGlucose();
  };

  const handleSearchResult = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTermResult = event.target.value;
    setSearchTermResult(newSearchTermResult);
    setPage(0); // Reset ke halaman pertama saat pencarian berubah
    // Update query params
    updateQueryParams({ search: newSearchTermResult, page: "1" });
  };

  const handleValidationChange = (event: SelectChangeEvent) => {
    const newValidationStatus = event.target.value;
    setValidationStatus(newValidationStatus);
    setPage(0); // Reset ke halaman pertama saat filter berubah

    // Update query params
    updateQueryParams({ is_validation: newValidationStatus, page: "1" });
  };

  const handleDateChange = (newDate: dayjs.Dayjs | null) => {
    setSelectedDate(newDate);
    setPage(0); // Reset ke halaman pertama saat tanggal berubah
  };

  const handleStartDateChange = (newDate: dayjs.Dayjs | null) => {
    setStartDate(newDate);
    setPage(0);
  };

  const handleEndDateChange = (newDate: dayjs.Dayjs | null) => {
    setEndDate(newDate);
    setPage(0);
  };

  const handleDateFilterTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDateFilterType(event.target.value as "single" | "range");
    // Reset tanggal saat mengubah jenis filter
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
  };

  // Helper function untuk update query parameters
  const updateQueryParams = (newParams: Record<string, string>) => {
    const query: Record<string, string | undefined> = {
      ...router.query,
      menu: "results",
      ...newParams,
    };

    // Hapus parameter kosong
    Object.keys(query).forEach((key) => {
      const typedKey = key as keyof typeof query; // Type assertion
      if (query[typedKey] === "" || query[typedKey] === undefined) {
        delete query[typedKey];
      }
    });

    router.push(
      {
        pathname: "/dashboard",
        query,
      },
      undefined,
      { shallow: true }
    );
  };

  const resetFilters = () => {
    // Reset state filter
    setSearchTermResult("");
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
    setValidationStatus("");
    setDateFilterType("single");
    setSelectedRoom(""); // ✅ Reset room juga
    setPage(0);

    // Update query params ke nilai default
    updateQueryParams({
      page: "1",
      limit: rowsPerPage.toString(),
      search: "",
      is_validation: "",
      room: "", // ✅ Reset room di query params
      date_time: "",
      start_date: "",
      end_date: "",
    });

    // Muat ulang data
    fetchDataGlucose();
  };

  const fetchUser = () => {
    const token = Cookies.get("authToken"); // Ambil token dari cookies

    if (!token) {
      router.push("/login");
      return;
    }
    getRequest("/auth/verify-token").catch((error) => {
      console.error("Error fetching user:", error);

      // Tangani error dari backend
      if (
        error.response?.status === 401 || // Unauthorized
        error.response?.status === 403 || // Forbidden
        error.response?.data?.message === "Invalid token" // Token expired
      ) {
        // Hapus token karena tidak valid
        Cookies.remove("authToken");

        // Redirect ke halaman login
        router.push("/login");
      }
    });
  };

  useEffect(() => {
    fetchUser();
  });

  const handleConfirmValidation = async () => {
    if (!selectedResult) return;

    try {
      // Kirim permintaan ke API untuk memperbarui status validasi
      const response = await putRequest(
        `/api/test-glucosa/${selectedResult.id}/validation`,
        {
          is_validation: 1,
        }
      );

      // Perbarui data lokal menggunakan user_validation dari respons
      setResultData((prevData) =>
        prevData.map((item) =>
          item.id === selectedResult.id
            ? {
                ...item,
                is_validation: 1,
                user_validation: response.user_validation || userName, // Gunakan respons dari API atau fallback ke state
              }
            : item
        )
      );

      setOpenDialog(false); // Tutup dialog setelah berhasil
      showSuccessToast("Validation data successful!");
    } catch (error) {
      console.error("Error updating validation:", error);
      showErrorToast("Failed to validate data");
    }
  };

  const handlePrintClick = (result: PrintResult) => {
    const printWindow = window.open("", "_blank");

    // Format nilai glukosa dengan warna sesuai rentang normal/abnormal
    const getGlucoseStatusColor = (value: number) => {
      // Rentang nilai normal glukosa (mg/dL)
      const isNormal = value >= 70 && value <= 140;
      return isNormal ? "text-green-600" : "text-red-600";
    };

    // Mendapatkan status berdasarkan nilai
    const getGlucoseStatus = (value: number) => {
      if (value < 70) return "LOW";
      if (value > 140) return "HIGH";
      return "NORMAL";
    };

    // Format tanggal dan waktu
    const formatDate = (dateTime: string | number | Date) => {
      if (!dateTime) return "Not Available";
      const date = new Date(dateTime);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    };

    // Referensi rentang normal untuk glukosa
    const referenceRange = "70 - 140 mg/dL";
    const director = process.env.NEXT_PUBLIC_LAB_DIRECTOR;

    printWindow?.document.write(`
    <html>
      <head>
        <title>Glucosa Test Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
          
          body {
            font-family: 'Roboto', sans-serif;
            color: #334155;
            line-height: 1.5;
          }
          
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0;
              margin: 0;
            }
            .shadow-lg {
              box-shadow: none !important;
            }
            .page-break {
              page-break-after: always;
            }
            @page {
              margin: 1cm;
            }
          }
          
          .logo-placeholder {
            width: 60px;
            height: 60px;
            background-color: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 8rem;
            color: rgba(0, 0, 0, 0.03);
            pointer-events: none;
            z-index: 0;
          }
        </style>
      </head>
      <body class="bg-gray-50 p-0 m-0">
        <div class="watermark">LABORATORY</div>
        
        <div class="max-w-4xl mx-auto bg-white p-8 shadow-lg relative z-10">
          <header class="border-b border-gray-200 pb-6 mb-3 flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="logo-placeholder">
                <i class="fas fa-flask text-blue-600 text-2xl"></i>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-blue-800">RSUD Drs. H. Amri Tambunan</h1>
                <p class="text-gray-500 text-sm">Jl. Mh. Thamrin No.126, Lubuk Pakam Pekan, Kec. Lubuk Pakam, Kabupaten Deli Serdang, Sumatera Utara 20518</p>
                <p class="text-gray-500 text-sm">Tel: (061) 7952068 | Email: -</p>
              </div>
            </div>
            <div class="text-right">
              
            <div id="barcodeContainer" class="text-center">
            <div id="barcode"></div> <div class="text-xs text-center mt-1 font-medium">${
              result.patient_no_rm || result.patient_barcode
            }</div>
          </div>
            </div>
          </header>        
          
          <h2 class="text-lg font-semibold text-blue-800 border-b border-gray-200">PATIENT INFORMATION</h2>
          <div class="grid grid-cols-2 gap-6">
  <div>
    <table class="w-full text-sm mt-2">
      <tbody>
        <tr>
          <td class="py-0.5 font-medium text-gray-600 w-1/3">Patient ID:</td>
          <td class="py-0.5 font-bold">${result.patient_code}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600">Patient Name:</td>
          <td class="py-0.5 font-bold">${result.patient_name}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600">Gender:</td>
          <td class="py-0.5 font-bold">${result.patient_gender || ""}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600">Age:</td>
          <td class="py-0.5 font-bold">${calculateAge(
            result.patient_date_of_birth
          )}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600">Phone:</td>
          <td class="py-0.5 font-bold">${result.patient_number_phone || ""}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div>
    <table class="w-full text-sm">
      <tbody>
        <tr>
          <td class="py-0.5 font-medium text-gray-600 w-1/3">Nik:</td>
          <td class="py-0.5 font-bold">${result.patient_nik}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600 w-1/3">Test Date:</td>
          <td class="py-0.5 font-bold">${formatDate(result.date_time)}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600">Lab Number:</td>
          <td class="py-0.5 font-bold">${result.lab_number}</td>
        </tr>
        <tr>
          <td class="py-0.5 font-medium text-gray-600">Doctor:</td>
          <td class="py-0.5 font-bold">${
            result.patient_referral_doctor || "Self-referred"
          }</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

          <script>
            document.addEventListener('DOMContentLoaded', function () {
              const barcodeValue = "${
                result.patient_no_rm || result.patient_barcode
              }";

              if (barcodeValue) {
                const qrContainer = document.getElementById("barcode");
                if (qrContainer) {
                  // Clear previous QR if any
                  qrContainer.innerHTML = "";

                  new QRCode(qrContainer, {
                    text: barcodeValue,
                    width: 65,
                    height: 60,
                    correctLevel: QRCode.CorrectLevel.H
                  });
                }
              } else {
                const container = document.getElementById('barcodeContainer');
                if (container) container.style.display = 'none';
              }
            });
          </script>

        </section>
          
          <section class="mb-8">
            <h2 class="text-lg font-semibold text-blue-800 mt-3 pb-1 border-b border-gray-200">TEST RESULTS</h2>
            <table class="w-full border-collapse bg-white text-sm">
              <thead>
                <tr class="bg-gray-100">
                  <th class="py-3 px-4 text-left border-b-2 border-blue-700 font-semibold text-blue-900">Test</th>
                  <th class="py-3 px-4 text-left border-b-2 border-blue-700 font-semibold text-blue-900">Result</th>
                  <th class="py-3 px-4 text-left border-b-2 border-blue-700 font-semibold text-blue-900">Units</th>
                  <th class="py-3 px-4 text-left border-b-2 border-blue-700 font-semibold text-blue-900">Reference Range</th>
                  <th class="py-3 px-4 text-left border-b-2 border-blue-700 font-semibold text-blue-900">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="py-3 px-4 border-b border-gray-200 font-medium">Glucose</td>
                  <td class="py-3 px-4 border-b border-gray-200 font-bold ${getGlucoseStatusColor(
                    result.glucos_value
                  )}">${result.glucos_value}</td>
                  <td class="py-3 px-4 border-b border-gray-200">${
                    result.unit
                  }</td>
                  <td class="py-3 px-4 border-b border-gray-200">${referenceRange}</td>
                  <td class="py-3 px-4 border-b border-gray-200 font-bold ${getGlucoseStatusColor(
                    result.glucos_value
                  )}">${getGlucoseStatus(result.glucos_value)}</td>
                </tr>
              </tbody>
            </table>
          </section>
          
          <section class="mb-8">
            <h2 class="text-lg font-semibold text-blue-800 mb-3 pb-1 border-b border-gray-200">METHODOLOGY</h2>
            <div class="bg-blue-50 p-4 rounded-lg">
              <div class="flex justify-between items-start gap-6">
                <div class="flex-1">
                  <p class="mb-1 text-sm font-medium text-gray-600">Testing Method:</p>
                  <p class="font-medium">${
                    result.metode || "Enzymatic (Hexokinase)"
                  }</p>
                </div>
                <div class="flex-1 text-right">
                  <p class="mb-1 text-sm font-medium text-gray-600">Analyzer/Device:</p>
                  <p class="font-medium">${
                    result.device_name || "Automated Clinical Analyzer"
                  }</p>
                </div>
              </div>
            </div>
          </section>
          
          <section class="mb-8">
            <h2 class="text-lg font-semibold text-blue-800 mb-3 pb-1 border-b border-gray-200">COMMENTS</h2>
            <div class="bg-blue-50 p-4 rounded-lg">
              ${result.note || ""}
            </div>
          </section>
          
          
          <footer class="mt-12 pt-4 border-t border-gray-200">
            <div class="flex justify-between w-full">
              <div>
                <p class="font-bold mb-12">Laboratory Director:</p>
                <div class="border-b border-gray-400 w-48"></div>
                <p class="mt-1 text-sm">${
                  result.patient_referral_doctor || "N/A"
                }</p>
              </div>
              <div>
                <p class="font-bold mb-12">Analis Laboratorium:</p>
                <div class="border-b border-gray-400 w-48"></div>
                <p class="mt-1 text-sm">${result.user_validation || ""}</p>
              </div>
            </div>
            
            <div class="mt-2 text-center text-sm text-gray-500">
              <p class="font-bold mt-1">&copy; ${new Date().getFullYear()} Fans Cosa. All rights reserved.</p>
            </div>
          </footer>
          
          <div class="flex justify-center gap-4 mt-8 no-print">
            <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
              <i class="fas fa-print"></i> Print Report
            </button>
            <button onclick="window.close()" class="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
              <i class="fas fa-times"></i> Close
            </button>
          </div>
        </div>
      </body>
    </html>
  `);

    printWindow?.document.close();
  };

  // Handler untuk membuka dan menutup menu
  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    result: PrintResult
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedResult(result);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenDialog = () => {
    if (selectedResult) {
      setOpenDialog(true);
    }
  };

  return (
    <>
      <Head>
        <title>Glucose Test PrintResult</title>
        <link rel="icon" href="/assets/images/icon/fanscosa-icon.png" />
      </Head>
      <div className="flex justify-between items-center space-x-2">
        <div className="flex justify-start items-center gap-2">
          <ListAltOutlined className="h-7 w-7 text-black" />
          <h2 className="text-xl font-semibold text-black">
            Glucose Test Results
          </h2>
        </div>
      </div>

      {/* Search and Filter Area */}
      <Paper elevation={3} sx={{ p: 2, mt: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {/* Search Field */}
          <Grid item xs={12}>
            <TextField
              label="Search Patient Name or Code"
              variant="outlined"
              value={searchTermResult}
              onChange={handleSearchResult}
              fullWidth
              className="flex-grow"
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
                endAdornment: searchTermResult && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchTermResult("")}
                      edge="end"
                    >
                      <Close />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Validation Status Filter */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ height: 55 }}>
              <InputLabel id="validation-status-label">
                Validation Status
              </InputLabel>
              <Select
                labelId="validation-status-label"
                id="validation-status"
                value={validationStatus}
                label="Validation Status"
                onChange={handleValidationChange}
                sx={{ height: 55 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="0">Not Validated</MenuItem>
                <MenuItem value="1">Validated</MenuItem>
              </Select>
            </FormControl>
          </Grid>

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
                {availableRooms.length > 0 ? (
                  availableRooms.map((room, index) => {
                    console.log(`🏠 Rendering room ${index}:`, room);
                    return (
                      <MenuItem key={`room-${index}-${room}`} value={room}>
                        {room}
                      </MenuItem>
                    );
                  })
                ) : (
                  <MenuItem disabled value="">
                    No rooms available
                  </MenuItem>
                )}
              </Select>
              {/* Debug info di bawah select */}
              <Typography variant="caption" sx={{ mt: 0.5, color: "gray" }}>
                {availableRooms.length > 0
                  ? `${availableRooms.length} rooms available`
                  : "Loading rooms..."}
              </Typography>
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
            {dateFilterType === "single" ? (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      sx: { height: 55 },
                    },
                  }}
                />
              </LocalizationProvider>
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      sx: { height: 55 },
                    },
                  }}
                />
              </LocalizationProvider>
            )}
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

          {/* Action Buttons */}
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

              {/* Export Button - hanya muncul jika dateFilterType === "range" */}
              {dateFilterType === "range" && (
                <Tooltip
                  title={
                    !startDate || !endDate
                      ? "Please select both start and end date to export"
                      : "Export data to CSV file"
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleExportDataClientSide}
                      startIcon={<GetApp />}
                      disabled={!startDate || !endDate || isExporting}
                      sx={{
                        height: 55,
                        flex: 1,
                        opacity: !startDate || !endDate ? 0.6 : 1,
                      }}
                    >
                      {isExporting ? "Exporting..." : "Export Data"}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LoadingComponent
          text="Loading Data Results..."
          spinnerColor="#1e2dfa"
          textColor="#333"
        />
      ) : (
        // Konten utama (data tabel)
        <>
          <Paper elevation={3}>
            <TableContainer className="h-full">
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={9} sx={{ backgroundColor: "#f9f9f9" }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold", color: "#333" }}
                      >
                        {searchTermResult.trim()
                          ? `Total Hasil Pencarian: ${totalFilteredResult}`
                          : `Total Data Keseluruhan: ${totalGlucoseTestResult}`}
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
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Room
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Date & Time
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: "16px",
                        textAlign: "center",
                      }}
                    >
                      Glucose Value
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Unit
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Metode
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "16px" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {resultData.length > 0 ? (
                    resultData.map((glucosaTest, index) => (
                      <TableRow
                        key={glucosaTest.id}
                        sx={{
                          backgroundColor:
                            glucosaTest.is_validation === 1
                              ? "rgba(74, 244, 104, 0.8)" // Warna hijau jika divalidasi
                              : "",
                        }}
                      >
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        {/* <TableCell>{glucosaTest.patient_code}</TableCell> */}
                        <TableCell>{glucosaTest.lab_number}</TableCell>
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
                              {glucosaTest.patient_name?.toUpperCase()} (
                              {glucosaTest.patient_gender})
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: "#555" }}
                            >
                              NIK: {glucosaTest.patient_nik}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: "#555" }}
                            >
                              No. RM: {glucosaTest.patient_no_rm} | No.
                              Registrasi: {glucosaTest.patient_no_registrasi}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {glucosaTest.patient_room?.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexDirection="column">
                            <Typography variant="body2">
                              <Box component="span" sx={{ fontWeight: "bold" }}>
                                Order Date :
                              </Box>{" "}
                              <Box component="span">
                                {glucosaTest.patient_created_at
                                  ? dayjs(glucosaTest.patient_created_at)
                                      .locale("id")
                                      .format("dddd, DD MMMM YYYY HH:mm")
                                  : "-"}
                              </Box>
                            </Typography>

                            <Typography variant="body2">
                              <Box component="span" sx={{ fontWeight: "bold" }}>
                                Test Date :
                              </Box>{" "}
                              <Box component="span">
                                {glucosaTest.date_time
                                  ? dayjs(glucosaTest.date_time)
                                      .locale("id")
                                      .format("dddd, DD MMMM YYYY HH:mm")
                                  : "-"}
                              </Box>
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell
                          sx={{
                            textAlign: "center",
                            verticalAlign: "middle",
                            fontWeight: "bold",
                          }}
                        >
                          {glucosaTest.glucos_value}
                        </TableCell>
                        <TableCell>{glucosaTest.unit}</TableCell>
                        <TableCell>
                          {glucosaTest.metode || "Not Specified"}
                        </TableCell>
                        {/* Kolom Actions dengan Menu Dropdown */}
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleMenuClick(e, glucosaTest)}
                          >
                            <CgMoreVertical />
                          </IconButton>
                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(
                              anchorEl && selectedResult?.id === glucosaTest.id
                            )}
                            onClose={handleCloseMenu}
                          >
                            <MenuItem
                              onClick={() => {
                                handleOpenDialog();
                                handleCloseMenu();
                              }}
                              disabled={glucosaTest.is_validation === 1}
                              className="flex items-center"
                            >
                              <CheckCircleOutline className="mr-2" /> Validate
                            </MenuItem>

                            {/* <MenuItem
                              onClick={() => {
                                handlePrintClick(glucosaTest);
                                handleCloseMenu();
                              }}
                              className="items-center hidden"
                            >
                              <PrintIcon className="mr-2" /> Print
                            </MenuItem> */}
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                borderTop: "1px solid #ddd",
                backgroundColor: "#fafafa",
              }}
            >
              {/* Informasi Jumlah Data */}
              <Typography
                variant="body2"
                sx={{
                  color: "#555",
                  fontWeight: "bold",
                }}
              >
                Showing {resultData.length > 0 ? page * rowsPerPage + 1 : 0} -{" "}
                {Math.min((page + 1) * rowsPerPage, totalGlucoseTestResult)} of{" "}
                {totalGlucoseTestResult} results
              </Typography>

              {/* Pagination */}
              <TablePagination
                component="div"
                count={totalGlucoseTestResult}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_e, newPage) => {
                  setPage(newPage);
                  updateQueryParams({ page: (newPage + 1).toString() });
                }}
                onRowsPerPageChange={(e) => {
                  const newRowsPerPage = parseInt(e.target.value, 10);
                  setRowsPerPage(newRowsPerPage);
                  setPage(0);
                  updateQueryParams({
                    limit: newRowsPerPage.toString(),
                    page: "1",
                  });
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
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

      {/* Dialog Konfirmasi */}
      <DynamicDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onConfirm={handleConfirmValidation}
        title="Validation Confirmation"
        message="Are you sure you want to validate this data?"
        confirmButtonText="Confirm"
        cancelButtonText="Cancel"
        iconNotif={<QuestionMarkOutlined className="w-10 h-10 text-blue-600" />}
        iconButton={<CheckOutlined className="w-10 h-10 text-blue-600" />}
        confirmButtonColor="primary"
      />
    </>
  );
};

export default TestResults;
