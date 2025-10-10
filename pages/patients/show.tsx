import { useCallback, useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";
import { useRouter } from "next/router";
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import DateTimeDisplay from "@/components/DateTimeDisplay";
import Head from "next/head";
import {
  Close,
  ListAltOutlined,
  PeopleAltTwoTone,
  // QrCode2,
  RefreshOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { getRequest } from "@/utils/apiClient";
import LoadingComponent from "@/components/LoadingComponent";
// import QRCodeComponent from "@/components/QRCodeComponent";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CachedOutlinedIcon from "@mui/icons-material/CachedOutlined";
import { FaBarcode } from "react-icons/fa";
import BarcodeComponent from "@/components/BarcodeComponent";

// Register Chart.js components
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend
);

interface Patient {
  patient_code: string;
  nik: string;
  name: string;
  no_rm: string;
  gender: string;
  barcode?: string;
  place_of_birth: string;
  date_of_birth: string;
  address: string;
  number_phone: string;
  email: string;
}

interface GlucoseTest {
  id: number;
  lab_number: string;
  date_time: string;
  glucos_value: string;
  unit: string;
  patient_id: number;
  metode: string;
}

interface PatientDetailProps {
  patientId: string;
}

const PatientDetail = ({ patientId }: PatientDetailProps) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [glucoseTests, setGlucoseTests] = useState<GlucoseTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTests, setLoadingTests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const router = useRouter();
  const { page: queryPage = "1", limit: queryLimit = "10" } = router.query as {
    page?: string;
    limit?: string;
  };

  const [rowsPerPage, setRowsPerPage] = useState(Number(queryLimit));
  const [page, setPage] = useState(Number(queryPage) - 1);
  const [open, setOpen] = useState(false);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [dateFilterType, setDateFilterType] = useState<"single" | "range">(
    "single"
  );

  const fetchPatientDetail = async (id: string) => {
    try {
      setLoading(true);
      const result = await getRequest(`/api/patients/${id}`);
      setPatient(result.data);
    } catch (error) {
      console.error("Error fetching patient detail:", error);
      setError("Failed to fetch patient details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlucoseTests = useCallback(async () => {
    if (!patientId) return;
    setLoadingTests(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", (page + 1).toString());
      queryParams.append("limit", rowsPerPage.toString());

      if (searchTerm) {
        queryParams.append("lab_number", searchTerm);
      }

      if (dateFilterType === "single" && selectedDate) {
        queryParams.append("date", selectedDate.format("YYYY-MM-DD"));
      } else if (dateFilterType === "range" && startDate && endDate) {
        queryParams.append("start_date", startDate.format("YYYY-MM-DD"));
        queryParams.append("end_date", endDate.format("YYYY-MM-DD"));
      }

      const result = await getRequest(
        `/api/test-glucosa/patient/${patientId}?${queryParams.toString()}`
      );

      setGlucoseTests(result.data || []);

      // total keseluruhan (misal backend mengirim total_records)
      const totalAllRecords =
        result.pagination?.total_records ?? result.pagination?.total ?? 0;

      // total hasil filter/pencarian (fallback ke jumlah data sekarang)
      const totalFilteredRecords =
        result.pagination?.total_filtered ??
        result.pagination?.filtered ??
        (result.data ? result.data.length : 0);

      setTotalAll(totalAllRecords);
      setTotalFiltered(totalFilteredRecords);

      // untuk pagination tetap pakai totalFiltered
      setTotalRows(totalFilteredRecords);
    } catch (error) {
      console.error("Error fetching glucose tests:", error);
      setError("Failed to fetch glucose tests.");
      setGlucoseTests([]);
    } finally {
      setLoadingTests(false);
    }
  }, [
    patientId,
    page,
    rowsPerPage,
    searchTerm,
    dateFilterType,
    selectedDate,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    if (patientId) {
      fetchPatientDetail(patientId);
    }
  }, [patientId]);

  useEffect(() => {
    fetchGlucoseTests();
  }, [fetchGlucoseTests]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleDateFilterTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDateFilterType(event.target.value as "single" | "range");
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };

  const handleDateChange = (newDate: dayjs.Dayjs | null) => {
    setSelectedDate(newDate);
    setPage(0);
  };

  const handleStartDateChange = (newDate: dayjs.Dayjs | null) => {
    setStartDate(newDate);
    setPage(0);
  };

  const handleEndDateChange = (newDate: dayjs.Dayjs | null) => {
    setEndDate(newDate);
    setPage(0);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
    setDateFilterType("single");
    setPage(0);
  };

  const handleRefresh = () => {
    fetchGlucoseTests();
  };

  function calculateAge(dateOfBirth: string): string {
    const birthDate = new Date(dateOfBirth);
    const currentDate = new Date();
    const years = differenceInYears(currentDate, birthDate);
    const months = differenceInMonths(currentDate, birthDate) % 12;
    const days = differenceInDays(currentDate, birthDate) % 30;
    return `${years} year ${months} month ${days} day`;
  }

  const getGlucoseChartData = () => {
    // urutkan berdasarkan tanggal
    const sortedTests = [...glucoseTests].sort(
      (a, b) =>
        new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
    );

    const labels: string[] = [];
    const numericValues: (number | null)[] = [];

    sortedTests.forEach((test) => {
      const rawValue = test.glucos_value?.toString().trim() || "";

      // ambil angka dari string, contoh "123 mg/dL" -> 123
      const cleaned = rawValue.replace(/[^0-9.]/g, "");

      const numericValue = cleaned ? parseFloat(cleaned) : NaN;

      // simpan label tanggal
      labels.push(new Date(test.date_time).toLocaleDateString("id-ID"));

      // jika bukan angka (misal "HI", "LO"), simpan null agar Chart.js skip titik itu
      numericValues.push(isNaN(numericValue) ? null : numericValue);
    });

    return {
      labels,
      datasets: [
        {
          label: "Glucose Level (mg/dL)",
          data: numericValues,
          borderColor: "rgba(255, 0, 0, 1)",
          backgroundColor: "rgba(255, 0, 0, 0.2)",
          fill: false,
          tension: 0.4,
          pointRadius: 6,
          pointStyle: "circle",
          spanGaps: true, // agar garis tidak terputus oleh nilai null
        },
      ],
    };
  };

  const chartConfig = {
    type: "line" as const,
    data: getGlucoseChartData(),
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Glucose Level Over Time",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "Glucose Value (mg/dL)",
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <LoadingComponent
        text="Loading Patient Details..."
        spinnerColor="#1e2dfa"
        textColor="#333"
      />
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!patient) {
    return <Typography>Patient not found</Typography>;
  }

  const handleBackClick = () => {
    router.push("/dashboard?menu=patients&page=1&limit=10&search=");
  };

  // Fungsi menentukan status glukosa berdasarkan string
  const getGlucoseStatus = (value: string) => {
    if (!value) return { text: "Unknown", color: "#9CA3AF" };

    const val = value.toString().trim().toUpperCase();

    if (val.includes("HI")) return { text: "Very High", color: "#E53935" };
    if (val.includes("LO")) return { text: "Low", color: "#1E88E5" };

    // Ambil angka dari string (misal "123 mg/dL" -> 123)
    const numeric = parseFloat(val.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric)) return { text: "Unknown", color: "#9CA3AF" };

    if (numeric < 70) return { text: "Low", color: "#1E88E5" };
    if (numeric < 140) return { text: "Normal", color: "#43A047" };
    if (numeric < 200) return { text: "High", color: "#FB8C00" };
    return { text: "Very High", color: "#E53935" };
  };

  return (
    <>
      <Head>
        <title>Patient Details</title>
        <link rel="icon" href="/assets/images/icon/fanscosa-icon.png" />
      </Head>
      <div className="flex justify-between items-center mb-3">
        <div className="flex justify-start items-center gap-2">
          <PeopleAltTwoTone className="h-5 w-5 text-black" />
          <h2 className="text-xl font-semibold text-black">
            Patient Information Details
          </h2>
        </div>
        <Button
          onClick={handleBackClick}
          variant="outlined"
          startIcon={<FiArrowLeft />}
          sx={{ color: "#1976d2", fontWeight: "bold" }}
        >
          Back
        </Button>
      </div>

      {/* Patient Information */}
      <div className="mt-2">
        <Paper>
          <div className="grid grid-cols-2 gap-4 p-4 rounded-md px-4">
            <div>
              <p className="text-md font-semibold text-black">Name</p>
              <p className="font-medium">
                {patient.name} [ {calculateAge(patient.date_of_birth)} ]
              </p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Barcode</p>
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
                    {patient.no_rm ? (
                      <BarcodeComponent value={patient.no_rm} />
                    ) : (
                      patient.barcode && (
                        <BarcodeComponent value={patient.barcode} />
                      )
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <p className="text-md font-semibold text-black">NIK</p>
              <p className="font-medium">{patient.nik}</p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Patient Code</p>
              <p className="font-medium">{patient.patient_code}</p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Gender</p>
              <p className="font-medium">{patient.gender}</p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Address</p>
              <p className="font-medium">{patient.address}</p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Place of Birth</p>
              <p className="font-medium">{patient.place_of_birth}</p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Phone Number</p>
              <p className="font-medium">{patient.number_phone}</p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Date of Birth</p>
              <p className="font-medium">
                {new Date(patient.date_of_birth).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-md font-semibold text-black">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
          </div>
        </Paper>
      </div>

      {/* Glucose Test Results Section */}
      <div className="mt-4">
        <div className="flex justify-start items-center gap-2">
          <ListAltOutlined className="h-5 w-5 mt-2 text-black" />
          <h2 className="text-xl font-semibold mt-2 text-black">
            Glucose Test Results
          </h2>
        </div>
        <Paper elevation={3} sx={{ p: 2, mt: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Search by Lab Number"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                fullWidth
                sx={{ "& .MuiInputBase-root": { height: 55 } }}
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
            {dateFilterType === "single" ? (
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Select Date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            ) : (
              <>
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
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
                  disabled={loadingTests}
                >
                  Refresh Data
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {loadingTests ? (
          <LoadingComponent
            text="Loading Glucose Test Results..."
            spinnerColor="#1e2dfa"
            textColor="#333"
          />
        ) : (
          <>
            <Paper className="space-y-4">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ backgroundColor: "#f9f9f9" }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: "bold", color: "#333" }}
                        >
                          {searchTerm.trim() ||
                          selectedDate ||
                          startDate ||
                          endDate
                            ? `Total Hasil Pencarian: ${totalFiltered} dari ${totalAll} data`
                            : `Total Data Keseluruhan: ${totalAll}`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>No.</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Lab Number
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Date & Time
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Glucose Value
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Metode</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {glucoseTests.length > 0 ? (
                      glucoseTests.map((test, index) => {
                        const status = getGlucoseStatus(test.glucos_value);
                        return (
                          <TableRow key={test.id}>
                            <TableCell>
                              {page * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell>
                              {test.lab_number || "Undefined"}
                            </TableCell>
                            <TableCell>
                              <DateTimeDisplay dateTime={test.date_time} />
                            </TableCell>
                            <TableCell>{test.glucos_value}</TableCell>

                            {/* ✅ Status Keterangan */}
                            <TableCell>
                              <span
                                style={{
                                  color: "#fff",
                                  backgroundColor: status.color,
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontWeight: "bold",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {status.text}
                              </span>
                            </TableCell>

                            <TableCell>{test.unit}</TableCell>
                            <TableCell>
                              {test.metode || "Not specified"}
                            </TableCell>
                          </TableRow>
                        );
                      })
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
                            <SearchOutlined
                              sx={{ fontSize: 40, color: "#9CA3AF", mb: 1 }}
                            />
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 500 }}
                            >
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
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <TablePagination
                  component="div"
                  count={totalRows}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(_e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                />
              </Box>
            </Paper>
            <div className="mb-10"></div>
            <Paper>
              <Line data={chartConfig.data} options={chartConfig.options} />
            </Paper>
          </>
        )}
      </div>
    </>
  );
};

export default PatientDetail;
