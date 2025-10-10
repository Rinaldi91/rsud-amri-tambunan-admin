import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import Cookies from "js-cookie";
import Image from "next/image";
import {
  Badge,
  // Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
  Collapse,
} from "@mui/material";
import PatientDetail from "../patients/show";
import DashboardPage from "./page";
import { getRequest, putRequest, testApiConnection } from "@/utils/apiClient";
import {
  // Android,
  Cast,
  HomeOutlined,
  ListAltOutlined,
  ManageAccountsOutlined,
  PeopleOutline,
  SettingsOutlined,
  ExpandLess,
  ExpandMore,
  Business,
  Biotech,
  // Backup,
} from "@mui/icons-material";
import TestResults from "../results";
import BuildApk from "../build";
import AccountSettingPage from "../account_setting";
import DynamicDialog from "@/components/DynamicDialog";
import { showSuccessToast } from "@/utils/notif";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import CreateUserPage from "../account_setting/create";
import { useSearchParams } from "next/navigation";
import GeneralPage from "../setting";
import UserDetailsPage from "../account_setting/view";
import Patients from "../patients";
// import OfflineForm from "../offlines";
// import HistoryIcon from "@mui/icons-material/History";
import ActivityLogs from "../activity_log";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EditUserPage from "../account_setting/edit";
import LabOrders from "../lab_orders";
import GlucoseTestPage from "../glucose-test";

// Interface definitions
interface GlucoseTest {
  id: number;
  date_time: string;
  glucos_value: number;
  unit: string;
  patient_id: number;
  device_name: string;
  metode: string;
  is_validation: number;
  patient_name: string;
  patient_code: string;
  lab_number: string;
  created_at: string;
  updated_at: string;
}

interface NotificationsState {
  total: number;
  dataList: GlucoseTest[];
}

interface Setting {
  id: number;
  name: string;
  address: string;
  email: string;
  phone: string;
  maps: string;
  created_at: string;
  updated_at: string;
}

// Interface untuk menu item
interface MenuItem {
  name: string;
  icon: React.ReactElement;
  menu: string;
  hasSubMenu?: boolean;
  expandIcon?: React.ReactElement;
}

const Dashboard = () => {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [selectedUserID, setSelectUserID] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const addParam = searchParams?.get("add") || "false";
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredNotif, setIsHoveredNotif] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // State untuk sub menu settings
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [showLogout, setShowLogout] = useState(false);
  const [notifications, setNotifications] = useState<NotificationsState>({
    total: 0,
    dataList: [],
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Komponen untuk menampilkan error
  const ErrorDisplay = ({
    error,
    onRetry,
  }: {
    error: string;
    onRetry: () => void;
  }) => (
    <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-red-600 text-lg font-semibold mb-2">
        ⚠️ Error Loading Dashboard
      </div>
      <div className="text-red-500 text-sm mb-4 text-center">{error}</div>
      <button
        onClick={onRetry}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Try Again
      </button>
    </div>
  );

  useEffect(() => {
    if (setting) {
      setLoading(false);
    }
  }, [setting]);

  useEffect(() => {
    if (!router.isReady) return;

    const fetchDataDashboard = async () => {
      try {
        const token = Cookies.get("authToken");
        // console.log("🔐 Checking token:", token ? "Present" : "Missing");

        if (!token) {
          // console.log("❌ No token found, redirecting to login");
          router.replace("/login");
          return;
        }

        // console.log("🔄 Testing API connection...");
        const isConnectionValid = await testApiConnection();

        if (!isConnectionValid) {
          // console.log("❌ API connection failed");
          setError("API connection failed. Please check the server.");
          return;
        }

        console.log("🔄 Verifying token...");
        const userRes = await getRequest("/auth/verify-token");

        if (userRes.status !== "success") {
          // console.error("❌ Token verification failed:", userRes);
          Cookies.remove("authToken");
          router.replace("/login");
          return;
        }

        console.log("✅ Token verified, user data:", userRes.data);
        const roleID = userRes.data.roleId;
        setUserName(userRes.data.name);

        console.log("🔄 Fetching dashboard data...");

        try {
          const notificationRes = await getRequest(
            "/api/test-glucosa/counts_total_new_results"
          );
          if (notificationRes.status === "success" && notificationRes.data) {
            const { total, dataList } = notificationRes.data;
            setNotifications({ total, dataList });
            console.log("✅ Notifications loaded:", total);
          }
        } catch (error) {
          console.error("❌ Failed to load notifications:", error);
          setError("Failed to load notifications.");
          setNotifications({ total: 0, dataList: [] });
        }

        try {
          const settingRes = await getRequest("/api/setting");
          if (settingRes.status === "success") {
            setSetting(settingRes.data);
            console.log("✅ Settings loaded");
          }
        } catch (error) {
          console.error("❌ Failed to load settings:", error);
          setError("Failed to load settings.");
        }

        try {
          const roleRes = await getRequest(`/api/roles/${roleID}`);
          if (roleRes.status === "success") {
            setUserRole(roleRes.data.name);
            console.log("✅ Role loaded:", roleRes.data.name);
          }
        } catch (error) {
          console.error("❌ Failed to load role:", error);
          setError("Failed to load user role.");
          setUserRole("User");
        }

        console.log("✅ Dashboard data loading completed");
      } catch (err: any) {
        console.error("❌ Dashboard initialization error:", err);

        if (err.response?.status === 403 || err.response?.status === 401) {
          Cookies.remove("authToken");
          router.replace("/login");
        } else if (err.message?.includes("Network Error")) {
          setError("Network error. Please check your connection.");
        } else {
          setError("Unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDataDashboard();
  }, [router]);

  useEffect(() => {
    const { menu, id } = router.query;
    if (menu && typeof menu === "string") {
      setActiveMenu(menu);

      // Buka sub menu settings jika menu aktif adalah salah satu dari sub menu settings
      const settingsSubMenus = [
        "settings_general",
        "activity_log",
        // "backup_settings",
        "notification_settings",
        "appearance_settings",
        "language_settings",
      ];
      if (settingsSubMenus.includes(menu)) {
        setSettingsOpen(true);
      }
    }
    if (id && typeof id === "string") {
      setSelectedPatientId(id);
    } else {
      setSelectedPatientId(null);
    }
    if (menu === "user_detail" && id) {
      setSelectUserID(id as string);
    } else {
      setSelectUserID(null);
    }
  }, [router.query]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    Cookies.remove("authToken");
    router.push("/login");
    showSuccessToast("Logout Successfull..!");
  };

  const handleLogoutClick = () => {
    setShowLogout(true);
  };

  const confirmLogout = () => {
    handleLogout();
    setShowLogout(false);
  };

  const handleMenuClick = (menu: string) => {
    const query: {
      menu: string;
      page?: string;
      limit?: string;
      search?: string;
      id?: string;
    } = { menu };

    setActiveMenu(menu);

    // Handle settings menu click
    if (menu === "settings") {
      setSettingsOpen(!settingsOpen);
      return; // Jangan navigate, hanya toggle sub menu
    }

    if (menu === "patients") {
      router.push("/dashboard?menu=patients&page=1&limit=10&search=");
      query.search = "";
    } else if (menu === "results") {
      router.push("/dashboard?menu=results&page=1&limit=10&search=");
      query.search = "";
    } else if (menu === "lab_orders") {
      // Tambahkan kondisi ini
      router.push("/dashboard?menu=lab_orders&page=1&limit=10&search=");
      query.search = "";
    } else {
      router.push({
        pathname: "/dashboard",
        query: { menu },
      });
    }
  };

  // Sub menu items untuk Settings
  const settingsSubMenuItems = [
    { name: "General", icon: <Business />, menu: "settings_general" },
    { name: "Activity Logs", icon: <AssignmentIcon />, menu: "activity_log" },
    // { name: "Backup & Restore", icon: <Backup />, menu: "backup_settings" },
  ];

  const superAdminMenuItems: MenuItem[] = [
    { name: "Dashboard", icon: <HomeOutlined />, menu: "dashboard" },
    // { name: "Offline", icon: <Cast />, menu: "offlines" },
    { name: "Patients", icon: <PeopleOutline />, menu: "patients" },
    { name: "Lab Orders", icon: <Biotech />, menu: "lab_orders" },
    { name: "Results", icon: <ListAltOutlined />, menu: "results" },
    // { name: "Build APK", icon: <Android />, menu: "build_apk" },
    {
      name: "User Accounts",
      icon: <ManageAccountsOutlined />,
      menu: "account_setting",
    },
    {
      name: "Settings",
      icon: <SettingsOutlined />,
      menu: "settings",
      hasSubMenu: true,
      expandIcon: settingsOpen ? <ExpandLess /> : <ExpandMore />,
    },
  ];

  const adminMenuItems: MenuItem[] = [
    { name: "Dashboard", icon: <HomeOutlined />, menu: "dashboard" },
    // { name: "Offline", icon: <Cast />, menu: "offlines" },
    { name: "Patients", icon: <PeopleOutline />, menu: "patients" },
    { name: "Lab Orders", icon: <Biotech />, menu: "lab_orders" }, // Tambahkan baris ini
    { name: "Results", icon: <ListAltOutlined />, menu: "results" },
  ];

  const menuItems =
    userRole === "Super Admin"
      ? superAdminMenuItems
      : userRole === "Admin"
      ? adminMenuItems
      : [];

  // Function untuk render main content berdasarkan active menu
  const renderMainContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardPage />;
      // case "offlines":
      //   return <OfflineForm />;
      case "lab_orders":
        return <LabOrders />;
      case "patients":
        return selectedPatientId ? (
          <PatientDetail patientId={selectedPatientId} />
        ) : (
          <Patients />
        );
      case "results":
        return <TestResults />;
      case "glucose-test":
        return <GlucoseTestPage />;
      case "build_apk":
        return <BuildApk />;
      case "account_setting":
        return <AccountSettingPage />;
      case "create_account_setting":
        return addParam === "true" ? (
          <CreateUserPage />
        ) : (
          <AccountSettingPage />
        );
      case "edit_account_setting": // Tambahkan case ini
        return <EditUserPage />;
      case "user_detail":
        return selectedUserID ? (
          <UserDetailsPage userID={selectedUserID} />
        ) : (
          <AccountSettingPage />
        );
      case "settings_general":
        return <GeneralPage />;
      case "activity_log":
        return <ActivityLogs />;
      default:
        return <DashboardPage />;
    }
  };

  // Move the error check after all hooks
  if (error) {
    return <ErrorDisplay error={error} onRetry={() => location.reload()} />;
  }

  return (
    <>
      <Head>
        <title>Dashboard</title>
        <link rel="icon" href="/assets/images/icon/fanscosa-icon.png" />
      </Head>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-72 bg-blue-600 text-white flex flex-col">
          <div className="bg-red">
            <div className="flex items-center justify-center bg-red-700 py-2 px-1 h-[99%]">
              <Image
                src="/assets/images/fanscosaapp-01.png"
                alt="COSA Logo"
                width={800}
                height={400}
                className="mx-auto px-2"
              />
            </div>
          </div>
          <Divider />

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul>
              {menuItems.map((item, index) => (
                <li key={index} className="mb-2">
                  <button
                    onClick={() => handleMenuClick(item.menu)}
                    className={`flex items-center justify-between py-2 px-4 w-full rounded hover:bg-blue-700 ${
                      activeMenu === item.menu ||
                      (item.menu === "settings" &&
                        [
                          "settings_general",
                          "activity_log",
                          // "backup_settings",
                        ].includes(activeMenu))
                        ? "bg-blue-700"
                        : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </div>
                    {item.hasSubMenu && <span>{item.expandIcon}</span>}
                  </button>

                  {/* Render Sub Menu untuk Settings */}
                  {item.menu === "settings" && (
                    <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
                      <ul className="ml-4 mt-2">
                        {settingsSubMenuItems.map((subItem, subIndex) => (
                          <li key={subIndex} className="mb-1">
                            <button
                              onClick={() => handleMenuClick(subItem.menu)}
                              className={`flex items-center py-2 px-4 w-full rounded hover:bg-blue-700 text-sm ${
                                activeMenu === subItem.menu ? "bg-blue-700" : ""
                              }`}
                            >
                              <span className="mr-3">{subItem.icon}</span>
                              {subItem.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Collapse>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Header dan Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="bg-red-700 shadow px-6 flex justify-between items-center h-[11%]">
            <div className="flex flex-col flex-1 max-w-[50%]">
              {/* Company Name */}
              <div className="mb-3 mt-3">
                {loading ? (
                  <>
                    <Skeleton variant="text" width={300} height={32} />{" "}
                    {/* Untuk setting?.name */}
                    <Skeleton variant="text" width={500} height={24} />{" "}
                    {/* Untuk setting?.address */}
                  </>
                ) : (
                  <>
                    <Typography
                      variant="h6"
                      fontWeight="700"
                      color="white"
                      sx={{
                        letterSpacing: 0.5,
                        fontSize: "1.25rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {setting?.name}
                    </Typography>
                    <div>
                      <Typography
                        variant="subtitle1"
                        color="white"
                        sx={{ fontSize: "0.875rem", lineHeight: 1.2 }}
                      >
                        {setting?.address}
                      </Typography>
                    </div>
                  </>
                )}
              </div>

              {/* Contact Information */}
              {/*  */}
            </div>

            <div className="flex justify-end items-center gap-3">
              <div>
                <Badge
                  badgeContent={notifications.total}
                  color="error"
                  className={`cursor-pointer ${
                    isHoveredNotif ? "text-white" : "text-purple-900"
                  }`}
                >
                  <IconButton
                    onMouseEnter={() => setIsHoveredNotif(true)}
                    onMouseLeave={() => setIsHoveredNotif(false)}
                    onClick={handleClick}
                    style={{
                      backgroundColor: isHoveredNotif ? "#6a1b9a" : "#e1bee7",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                    }}
                  >
                    <NotificationsOutlinedIcon
                      style={{
                        color: isHoveredNotif ? "white" : "#6a1b9a",
                      }}
                    />
                  </IconButton>
                </Badge>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                >
                  <Typography variant="h6" style={{ padding: "8px 16px" }}>
                    New Glucose Test Result
                  </Typography>
                  <Divider />

                  {notifications.dataList.length > 0 ? (
                    notifications.dataList.map((item, index) => (
                      <MenuItem
                        key={index}
                        onClick={() => {
                          handleClose();
                          putRequest(`/api/test-glucosa/${item.id}/status`, {})
                            .then((response) => {
                              console.log(
                                "Status updated successfully",
                                response
                              );
                            })
                            .catch((error) => {
                              console.error("Error updating status:", error);
                            });
                          // window.location.href = `http://localhost:3002/dashboard?menu=results&search=${item.patient_code}&page=1&limit=10`;
                          window.location.href = `https://rsud-amritambunan.fanscosa.co.id/dashboard?menu=results&search=${item.lab_number}&page=1&limit=10`;
                        }}
                      >
                        <div>
                          <Typography variant="body2">
                            Patient Name: {item.patient_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Patient Code: {item.patient_code}, Glucose Value:{" "}
                            {item.glucos_value} {item.unit}
                          </Typography>
                        </div>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      There is no new glucose test results.
                    </MenuItem>
                  )}
                </Menu>
              </div>

              <div className="relative" ref={dropdownRef}>
                <div
                  className="border-spacing-1 rounded-2xl px-1 py-2"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <button
                    className="menu-btn focus:outline-none flex flex-wrap items-center justify-center bg-blue-300 hover:bg-blue-700 hover:text-white rounded-3xl p-1 border-none mr-3 transition-all duration-300"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleLogoutClick}
                  >
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-full bg-yellow-400 border-none transition-all duration-500 ${
                        isHovered ? "rotate-[360deg]" : "rotate-0 translate-x-0"
                      }`}
                    >
                      {isHovered ? (
                        <FaSignOutAlt
                          className={`text-3xl cursor-pointer transition-colors duration-100 ${
                            isHovered ? "text-white" : "text-black"
                          }`}
                        />
                      ) : (
                        <FaUser
                          className={`text-2xl cursor-pointer transition-colors duration-100 ${
                            isHovered ? "text-white" : "text-white"
                          }`}
                        />
                      )}
                    </div>

                    <div className="capitalize flex ml-2">
                      <h1
                        className={`text-md font-semibold transition-colors duration-100 ${
                          isHovered ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {isHovered ? "Logout" : `Hi, ${userName}`}
                      </h1>
                      <i className="fad fa-chevron-down ml-2 text-xs leading-none"></i>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <DynamicDialog
              open={showLogout}
              onClose={() => setShowLogout(false)}
              onConfirm={confirmLogout}
              title="Logout Confirmation"
              message="Are you sure you want to logout?"
              confirmButtonText="Logout"
              cancelButtonText="Cancel"
              iconNotif={<FaSignOutAlt className="w-7 h-7 text-red-600" />}
              iconButton={<FaSignOutAlt />}
              confirmButtonColor="error"
            />
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {renderMainContent()}
          </main>

          <footer className="bg-gray-100 px-6 flex justify-between items-center text-white text-sm">
            <span className="text-black">
              © {new Date().getFullYear()} Fans Cosa. All Rights Reserved.
            </span>
            <nav className="flex gap-4 p-6">
              <a href="#" className="hover:underline text-black">
                Privacy Policy
              </a>
              <a href="#" className="hover:underline text-black">
                Terms of Service
              </a>
              <a href="#" className="hover:underline text-black">
                Contact
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
