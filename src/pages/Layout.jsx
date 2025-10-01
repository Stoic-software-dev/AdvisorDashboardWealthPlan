

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, AppSettings, AdvisorProfile, SubUser, ClientIntakeSubmission, NetWorthIntakeSubmission, CustomLink } from '@/api/entities';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal';
import {
    LayoutDashboard,
    Users,
    GitBranch,
    Calendar,
    CheckSquare,
    Calculator,
    Bot,
    UserPlus,
    FileText,
    Globe,
    Settings,
    Menu,
    X,
    LogOut,
    Sun,
    Moon,
    UserCircle,
    Building,
    Palette,
    Bell,
    Target,
    ChevronDown,
    ChevronsLeft,
    ChevronsRight,
    ClipboardList,
    BookOpen,
    GitCompare,
    Package,
    ClipboardPlus,
    Shield,
    PieChart,
    Zap,
    ExternalLink,
    HardHat, // Added for 'In Development' section
    NotebookPen, // Added for 'Development Notes'
    Combine, // Added for 'All-In-One Overview'
    GitCompareArrows, // Added for 'Debt Comparison Calculator'
    Link as LinkIcon, // Added for custom links
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SheetTrigger } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import GiuseppeBot from '@/components/giuseppe_bot/GiuseppeBot';
import GlobalClientSearch from '@/components/shared/GlobalClientSearch';
import { Badge } from '@/components/ui/badge'; // Import Badge

// Enhanced caching with longer duration and better management
let appSettingsCache = null;
let advisorProfileCache = null;
let userCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // Increased to 15 minutes for better performance
const SHORT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for user data

const themeColorStyles = {
  blue: {
      '--color-accent': '#2563eb', // blue-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#eff6ff', // blue-50
      '--color-accent-text': '#1d4ed8', // blue-700
      '--color-accent-gradient-from': '#3b82f6', // blue-500
      '--color-accent-gradient-to': '#1d4ed8', // blue-700
  },
  green: {
      '--color-accent': '#16a34a', // green-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#f0fdf4', // green-50
      '--color-accent-text': '#166534', // green-800
      '--color-accent-gradient-from': '#22c55e', // green-500
      '--color-accent-gradient-to': '#15803d', // green-700
  },
  purple: {
      '--color-accent': '#9333ea', // purple-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#f5f3ff', // purple-50
      '--color-accent-text': '#7e22ce', // purple-700
      '--color-accent-gradient-from': '#a855f7', // purple-500
      '--color-accent-gradient-to': '#7e22ce', // purple-700
  },
  orange: {
      '--color-accent': '#ea580c', // orange-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#fff7ed', // orange-50
      '--color-accent-text': '#c2410c', // orange-700
      '--color-accent-gradient-from': '#f97316', // orange-500
      '--color-accent-gradient-to': '#c2410c', // orange-700
  },
  red: {
      '--color-accent': '#dc2626', // red-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#fef2f2', // red-50
      '--color-accent-text': '#b91c1c', // red-700
      '--color-accent-gradient-from': '#ef4444', // red-500
      '--color-accent-gradient-to': '#b91c1c', // red-700
  },
  indigo: {
      '--color-accent': '#4f46e5', // indigo-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#eef2ff', // indigo-50
      '--color-accent-text': '#4338ca', // indigo-700
      '--color-accent-gradient-from': '#6366f1', // indigo-500
      '--color-accent-gradient-to': '#4338ca', // indigo-700
  },
  teal: {
      '--color-accent': '#0d9488', // teal-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#f0fdfa', // teal-50
      '--color-accent-text': '#0f766e', // teal-700
      '--color-accent-gradient-from': '#14b8a6', // teal-500
      '--color-accent-gradient-to': '#0f766e', // teal-700
  },
  slate: {
      '--color-accent': '#475569', // slate-600
      '--color-accent-foreground': '#ffffff',
      '--color-accent-light': '#f1f5f9', // slate-100
      '--color-accent-text': '#334155', // slate-700
      '--color-accent-gradient-from': '#64748b', // slate-500
      '--color-accent-gradient-to': '#334155', // slate-700
  },
};

const menuItems = [
    {
        name: 'Core',
        icon: LayoutDashboard,
        children: [
            { name: 'Dashboard', path: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
            { name: 'Clients', path: 'ClientDirectory', icon: Users, permission: 'clients' },
            { name: 'Calendar', path: 'Calendar', icon: Calendar, permission: 'calendar' },
            { name: 'Tasks', path: 'Tasks', icon: CheckSquare, permission: 'tasks' },
        ]
    },
    {
        name: 'Client Management',
        icon: ClipboardList,
        children: [
            { name: 'Intake Forms', path: 'ClientIntakeManager', icon: ClipboardPlus, permission: 'clients' },
            { name: 'Workflows', path: 'Workflows', icon: GitBranch, permission: 'workflows' },
            { name: 'Checklists', path: 'Checklists', icon: ClipboardList, permission: 'workflows' },
        ]
    },
    {
        name: 'Financial Tools',
        icon: Calculator,
        children: [
            { name: 'Calculators', path: 'Calculators', icon: Calculator, permission: 'calculators' },
            // Removed: { name: 'Debt Comparison', path: 'DebtComparisonCalculator', icon: GitCompareArrows, permission: 'calculators' },
            { name: 'Risk Assessment', path: 'RiskAssessment', icon: PieChart, permission: 'calculators' },
            { name: 'Scenario Planner', path: 'ScenarioComparison', icon: GitCompare, permission: 'calculators' },
            { name: 'Portfolio Comparison', path: 'PortfolioComparison', icon: Target, permission: 'calculators' },
            { name: 'Report Builder', path: 'ReportBuilder', icon: FileText, permission: 'clients' },
        ]
    },
    {
        name: 'Libraries',
        icon: Building,
        children: [
            { name: 'Fund Library', path: 'FundLibrary', icon: Building, permission: 'clients' },
            { name: 'Model Portfolios', path: 'ModelPortfolios', icon: Package, permission: 'clients' },
        ]
    },
    {
        name: 'AI Tools',
        icon: Bot,
        children: [
            { name: 'Note Assistant', path: 'NotesAssistant', icon: Bot, permission: 'clients' },
        ]
    },
    {
        name: 'Administration',
        icon: Settings,
        children: [
            { name: 'Team', path: 'SubUsers', icon: UserPlus, permission: 'dashboard' },
            { name: 'Application Settings', path: 'AdvisorSettings', icon: Settings, permission: 'settings' },
        ]
    },
    {
        name: 'In Development',
        icon: HardHat, // Icon for the 'In Development' group
        children: [
            { name: 'All-In-One Overview', path: 'ComprehensiveOverviewCalculator', icon: Combine, permission: 'dev_tools', beta: true },
            { name: 'Development Notes', path: 'DevNotes', icon: NotebookPen, permission: 'dev_tools' },
        ]
    }
];

// Optimized delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced retry function with shorter delays for better performance
const retryApiCall = async (apiCall, maxRetries = 2, baseDelay = 500) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delayTime = baseDelay * Math.pow(1.5, i); // Reduced exponential backoff
        console.log(`Rate limited, retrying in ${delayTime}ms (attempt ${i + 1}/${maxRetries})`);
        await delay(delayTime);
        continue;
      }
      throw error;
    }
  }
};

// Enhanced cache validation
const isCacheValid = (cacheTime, duration = CACHE_DURATION) => {
  return Date.now() - cacheTime < duration;
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  // Cleaner public page check - THIS IS THE CRITICAL LIST
  const publicPages = [
    'ClientIntakeForm',
    'NetWorthIntakeForm',
    'ClientSelfUpdateForm',
    'ReportPrintView',
    'NetWorthUpdateForm',
    'TestPublicPage' // Added our test page
  ];
  const isPublicPage = publicPages.some(page => location.pathname.includes(page));
  
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [settings, setSettings] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [advisorProfile, setAdvisorProfile] = useState(null);
  const [showGlobalSettingsModal, setShowGlobalSettingsModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGiuseppeOpen, setIsGiuseppeOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // New state for initial load
  const [expandedSections, setExpandedSections] = useState(new Set(['Core'])); // State for expanded sections
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [customLinks, setCustomLinks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // THIS CHECK IS NOW REDUNDANT BECAUSE OF THE RENDER LOGIC, BUT WE LEAVE IT FOR SAFETY
      // Skip authentication and data loading for public pages
      if (isPublicPage) {
        setIsInitialLoad(false); // Mark as loaded so the public layout renders
        // No need to fetch user, settings, etc. for public pages as they won't be used for this layout
        return;
      }
      
      if (!isInitialLoad) return;

      try {
        const currentTime = Date.now();
        let currentUser;

        // Step 1: Get user info with enhanced caching
        try {
          if (userCache && isCacheValid(lastCacheTime, SHORT_CACHE_DURATION)) {
            currentUser = userCache;
            console.log("Using cached user data");
          } else {
            currentUser = await retryApiCall(() => User.me(), 2, 1000); // maxRetries=2, baseDelay=1000
            userCache = currentUser; // Store in cache
          }
        } catch (userError) {
          console.error("Error getting user:", userError);
          // THIS IS THE CRITICAL CHANGE: Do not redirect if it is a public page.
          if (userError.response && userError.response.status === 401 && !isPublicPage) {
            window.location.href = createPageUrl("Login");
            return;
          }
          currentUser = { email: "user@example.com", role: "admin", full_name: "User" };
        }

        let determinedRole = currentUser.role;
        let userPermissions = {}; // Initialize userPermissions here

        // Step 2: Handle role determination with optimized delays
        if (determinedRole !== 'admin') {
          try {
            await delay(1000); // Reduced delay from 2000
            const matchingSubUsers = await retryApiCall(() => 
              SubUser.filter({ email: currentUser.email }), 2, 1500 // maxRetries=2, baseDelay=1500
            );
            
            if (matchingSubUsers && matchingSubUsers.length > 0) {
              determinedRole = 'user'; // Ensure role is 'user'
              userPermissions = matchingSubUsers[0].permissions || {}; // Use permissions from SubUser record
              
              // Mark sub-user as active if they were 'invited'
              if (matchingSubUsers[0].status === 'invited') {
                  await delay(500); // Reduced delay from 1000
                  await retryApiCall(() => 
                    SubUser.update(matchingSubUsers[0].id, { status: 'active', last_login: new Date().toISOString() }), 2, 1000 // maxRetries=2, baseDelay=1000
                  );
              }
            } else {
              // This user is NOT an invited team member, but their role is not 'admin'.
              // This means they are the main user of this tenant (new deployment) and should be an admin.
              await delay(500); // Reduced delay from 1000
              await retryApiCall(() => 
                User.updateMyUserData({ role: 'admin' }), 2, 1000 // maxRetries=2, baseDelay=1000
              );
              determinedRole = 'admin'; // Promote to admin
            }
          } catch (error) {
            console.warn("Error checking SubUser status, defaulting to admin for new tenant:", error);
            determinedRole = 'admin';
          }
        }

        // Now set the actual user and permissions based on the determined role
        setUser({ ...currentUser, role: determinedRole }); // Ensure local user object reflects the determined role

        // Grant permissions based on role
        if (determinedRole === 'admin') {
          // If determined role is admin, grant all permissions based on available menu items
          // Collect all unique permissions from the new menuItems structure
          const allUniquePermissions = new Set();
          menuItems.forEach(group => {
            if (group.children) {
              group.children.forEach(child => {
                if (child.permission) {
                  allUniquePermissions.add(child.permission);
                }
              });
            }
          });
          allUniquePermissions.forEach(perm => {
            userPermissions[perm] = true;
          });
        }
        setPermissions(userPermissions); // Set the collected permissions

        // Step 3: Load AppSettings with enhanced caching
        let appSettingsData;
        try {
          if (appSettingsCache && isCacheValid(lastCacheTime)) {
            appSettingsData = appSettingsCache;
            console.log("Using cached app settings");
          } else {
            await delay(1000); // Reduced delay from 3000
            const settingsList = await retryApiCall(() => AppSettings.list(), 2, 2000); // maxRetries=2, baseDelay=2000
            if (settingsList && settingsList.length > 0) {
                appSettingsData = settingsList[0];
            } else {
                // AppSettings don't exist, create a default one for this new tenant
                await delay(1000); // Reduced delay from 2000
                appSettingsData = await retryApiCall(() => 
                  AppSettings.create({
                    crm_name: "FinanceFlow",
                    color_theme: "blue",
                    logo_url: ""
                  }), 2, 1500 // maxRetries=2, baseDelay=1500
                );
            }
            appSettingsCache = appSettingsData;
            lastCacheTime = currentTime; // Update the cache time after successful fetch/create
          }
          setSettings(appSettingsData);
        } catch (error) {
            console.error("Failed to load or create AppSettings:", error);
            // Use cached data if available, otherwise fallback to default in-memory setting
            if (appSettingsCache) {
              setSettings(appSettingsCache);
            } else {
              setSettings({ crm_name: "FinanceFlow", color_theme: "blue", logo_url: "" });
            }
        }

        // Step 4: Load AdvisorProfile with enhanced caching
        let advisorProfileData;
        try {
          if (advisorProfileCache && isCacheValid(lastCacheTime)) {
            advisorProfileData = advisorProfileCache;
            console.log("Using cached advisor profile");
          } else {
            await delay(1500); // Reduced delay from 4000
            const profileList = await retryApiCall(() => AdvisorProfile.list(), 2, 2500); // maxRetries=2, baseDelay=2500
            if (profileList && profileList.length > 0) {
                advisorProfileData = profileList[0];
            } else {
                // AdvisorProfile doesn't exist, create a default one
                await delay(1000); // Reduced delay from 2000
                advisorProfileData = await retryApiCall(() => 
                  AdvisorProfile.create({
                    full_name: currentUser.full_name || "New Advisor", // Use currentUser full_name for new profile
                    email: currentUser.email,
                    company_name: "My Advisory"
                  }), 2, 1500 // maxRetries=2, baseDelay=1500
                );
            }
            advisorProfileCache = advisorProfileData;
            // lastCacheTime is intentionally updated only once per fetchData run, after appSettings, to apply to both.
          }
          setAdvisorProfile(advisorProfileData);
        } catch (error) {
            console.error("Failed to load or create AdvisorProfile:", error);
            // Use cached data if available, otherwise fallback to default in-memory profile
            if (advisorProfileCache) {
              setAdvisorProfile(advisorProfileCache);
            } else {
              setAdvisorProfile({
                full_name: currentUser.full_name || "Advisor", // Use currentUser full_name for fallback
                company_name: "Financial Advisory"
              });
            }
        }

        // Load pending submissions count for notification badge and custom links
        try {
            const [clientSubmissions, netWorthSubmissions, customLinksData] = await Promise.all([
              ClientIntakeSubmission.filter({ status: 'pending' }),
              NetWorthIntakeSubmission.filter({ status: 'pending' }),
              CustomLink.list('sort_order'),
            ]);
            const totalPending = (clientSubmissions ? clientSubmissions.length : 0) + 
                                (netWorthSubmissions ? netWorthSubmissions.length : 0);
            setPendingSubmissions(totalPending);
            setCustomLinks(customLinksData || []);
        } catch (error) {
            console.error('Error loading submissions or custom links:', error);
            setPendingSubmissions(0);
            setCustomLinks([]);
        }
      } catch (error) {
        console.error("Error loading initial data process:", error);
        setUser(prevUser => prevUser || { email: "unknown@example.com", role: "admin", full_name: "User" });
        setSettings(appSettingsCache || { crm_name: "FinanceFlow", color_theme: "blue", logo_url: "" });
        setAdvisorProfile(advisorProfileCache || { company_name: "Financial Advisory" });
        setPermissions({
          dashboard: true, clients: true, workflows: true, calendar: true, tasks: true, calculators: true, settings: true, dev_tools: true // Ensure dev_tools for fallback admin
        });
        setCustomLinks([]);
      } finally {
        setIsInitialLoad(false); // Mark initial load as complete regardless of success/failure
      }
    };

    fetchData();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInitialLoad, isPublicPage]);

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      window.location.href = createPageUrl("Dashboard");
    }
  }, [location.pathname]);

  // Auto-expand the relevant section when a sub-item is active
  useEffect(() => {
    const currentPath = location.pathname;
    let parentGroup = null;

    menuItems.forEach(group => {
        if (group.children) {
            group.children.forEach(child => {
                if (createPageUrl(child.path) === currentPath) {
                    parentGroup = group.name;
                }
            });
        }
    });

    if (parentGroup && !expandedSections.has(parentGroup)) {
        setExpandedSections(prev => new Set(prev).add(parentGroup));
    }
  }, [location.pathname, expandedSections]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // Clear cache on logout
      appSettingsCache = null;
      advisorProfileCache = null;
      userCache = null; // Clear user cache on logout
      lastCacheTime = 0;
      await User.logout();
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoggingOut(false);
    }
  };

  const handleOpenGlobalSettings = () => {
    setShowGlobalSettingsModal(true);
  };

  // New function to handle settings updates from the modal and update cache
  const handleSettingsUpdate = (newSettings) => {
    setSettings(newSettings);
    appSettingsCache = newSettings; // Update the cache
    lastCacheTime = Date.now(); // Reset cache timer after update
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(sectionName)) {
            newSet.delete(sectionName);
        } else {
            newSet.add(sectionName);
        }
        return newSet;
    });
  };

  const getFilteredMenu = (menu, perms, userRole) => {
    if (!perms) return [];
    return menu.map(group => {
        if (!group.children) {
            return null;
        }

        // Filter children within a group
        const visibleChildren = group.children.filter(child => {
            if (child.name === 'Application Settings') return true; // Always show settings if group is visible
            if (child.name === 'Team') {
                return userRole === 'admin' || perms['dashboard'];
            }
            // For 'In Development' items, ensure it's either admin or has explicit 'dev_tools' permission
            if (group.name === 'In Development') {
              return userRole === 'admin' || (child.permission && perms[child.permission]);
            }
            
            return userRole === 'admin' || (child.permission && perms[child.permission]);
        });

        if (visibleChildren.length > 0) {
            return { ...group, children: visibleChildren };
        }
        return null;
    }).filter(Boolean);
  };
  
  const filteredMenuItems = getFilteredMenu(menuItems, permissions, user?.role);

  const NavLink = ({ item, isCollapsed, isSubItem = false }) => {
    const isActive = location.pathname === createPageUrl(item.path);
    const showBadge = item.name === 'Intake Forms' && pendingSubmissions > 0;

    if (item.isPublicLink) {
      return (
        <a
          href={createPageUrl(item.path)}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isCollapsed ? 'justify-center' : ''}
                      ${isSubItem ? (isCollapsed ? '' : 'pl-8') : ''}
                      text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-50`}
          title={isCollapsed ? item.name : undefined}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">{item.name}</span>}
          {!isCollapsed && <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />}
        </a>
      );
    }

    return (
      <Link
        to={createPageUrl(item.path)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium relative ${isCollapsed ? 'justify-center' : ''}
                    ${isSubItem ? (isCollapsed ? '' : 'pl-8') : ''}
                    ${isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-50'
                    }`}
        title={isCollapsed ? item.name : undefined}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="truncate flex-1">{item.name}</span>
            {showBadge && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                {pendingSubmissions}
              </span>
            )}
            {item.beta && <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-700">Beta</Badge>}
          </>
        )}
        {isCollapsed && showBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] h-4 flex items-center justify-center leading-none">
            {pendingSubmissions > 99 ? '99+' : pendingSubmissions}
          </span>
        )}
        {isCollapsed && item.beta && (
            <Badge className="absolute -bottom-1 -right-1 text-xs px-1 py-0.5 bg-amber-500 text-white dark:bg-amber-700">B</Badge>
        )}
      </Link>
    );
  };

  const NavGroup = ({ group, isCollapsed }) => {
    const isExpanded = expandedSections.has(group.name);
    
    // Calculate total notifications for items in this group
    const getGroupNotificationCount = () => {
      let totalCount = 0;
      if (group.children) {
        group.children.forEach(child => {
          if (child.name === 'Intake Forms' && pendingSubmissions > 0) {
            totalCount += pendingSubmissions;
          }
          // Add other notification counts here as needed
        });
      }
      return totalCount;
    };
    
    const groupNotificationCount = getGroupNotificationCount();
    
    return (
        <div>
            <button
                onClick={() => toggleSection(group.name)}
                className={`flex items-center w-full gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium relative ${isCollapsed ? 'justify-center' : ''}
                            text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-50`}
                title={isCollapsed ? group.name : undefined}
            >
                <group.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate flex-1 text-left font-bold">{group.name}</span>}
                {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                
                {/* Show notification badge on collapsed group */}
                {isCollapsed && groupNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] h-4 flex items-center justify-center leading-none">
                    {groupNotificationCount > 99 ? '99+' : groupNotificationCount}
                  </span>
                )}
            </button>
            {!isCollapsed && isExpanded && (
                <div className="mt-1 space-y-1">
                    {group.children.map(child => (
                        <NavLink key={child.name} item={child} isSubItem={true} isCollapsed={isCollapsed} />
                    ))}
                </div>
            )}
        </div>
    );
  };

  const MobileNavLink = ({ item, onLinkClick }) => {
    const isActive = location.pathname === createPageUrl(item.path);
    const showBadge = item.name === 'Intake Forms' && pendingSubmissions > 0;

    if (item.isPublicLink) {
      return (
        <a
          href={createPageUrl(item.path)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base font-medium
                      text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-50`}
        >
          <item.icon className="w-6 h-6" />
          <span>{item.name}</span>
          <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
        </a>
      );
    }

    return (
      <Link
        to={createPageUrl(item.path)}
        onClick={onLinkClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base font-medium
                    ${isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-50'
                    }`}
      >
        <item.icon className="w-6 h-6" />
        <span className="flex-1">{item.name}</span>
        {showBadge && (
          <span className="bg-red-500 text-white text-sm rounded-full px-2 py-1 min-w-[1.5rem] h-6 flex items-center justify-center">
            {pendingSubmissions}
          </span>
        )}
        {item.beta && <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-700">Beta</Badge>}
      </Link>
    );
  };

  // PageTitle component requires `settings` to be loaded
  const PageTitle = () => {
    // Flatten menuItems to find the current item by path
    const allMenuItems = menuItems.flatMap(group => group.children || []);
    const currentItem = allMenuItems.find(item => createPageUrl(item.path) === location.pathname);
    return currentItem ? currentItem.name : currentPageName || "Dashboard";
  };

  // Theme styles depend on settings, provide a fallback if settings are null (e.g. for public pages)
  const themeStyles = (settings?.color_theme === 'custom' && settings?.custom_colors)
    ? {
        '--color-accent': settings.custom_colors.primary || '#4f46e5',
        '--color-accent-foreground': settings.custom_colors.foreground || '#ffffff',
        '--color-accent-light': settings.custom_colors.light || '#eef2ff',
        '--color-accent-text': settings.custom_colors.text || '#4338ca',
        '--color-accent-gradient-from': settings.custom_colors.gradient_from || '#6366f1',
        '--color-accent-gradient-to': settings.custom_colors.gradient_to || '#4338ca',
      }
    : themeColorStyles[settings?.color_theme] || themeColorStyles.blue; // Fallback to blue if color_theme is not found

  const cssVariables = Object.entries(themeStyles)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');

  // *** THIS IS THE CORE FIX ***
  // For public pages, render ONLY the children without the full app layout
  if (isPublicPage) {
    return (
      <div className={`${theme}`}>
        <style>{`:root { ${cssVariables} }`}</style>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
          <Suspense fallback={<div>Loading content...</div>}>
            {children}
          </Suspense>
        </div>
      </div>
    );
  }

  // Show loading state while initial data is loading (only for authenticated pages)
  if (!user || !settings || !advisorProfile || !permissions || isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl font-semibold">Loading dashboard...</div>
          <div className="text-sm text-gray-500 mt-2">Please wait while we set up your workspace</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme}`}>
      <style>{`:root { ${cssVariables} }`}</style>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <header className={`sticky top-0 z-40 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 transition-shadow ${isScrolled ? 'shadow-sm' : ''}`}>
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 bg-white dark:bg-gray-900 p-0 flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r"
                          style={{
                              background: `linear-gradient(to right, var(--color-accent-gradient-from), var(--color-accent-gradient-to))`
                          }}
                      >
                        {settings.logo_url ? (
                            <img
                                src={settings.logo_url}
                                alt={`${settings.crm_name} logo`}
                                className="w-8 h-8 object-contain rounded"
                            />
                        ) : (
                            <FileText className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">{settings.crm_name}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Financial Advisory CRM</p>
                      </div>
                    </div>
                  </div>
                  <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredMenuItems.map((group) => (
                      <div key={group.name}>
                        <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{group.name}</p>
                        {group.children.map(item => (
                            <MobileNavLink key={item.name} item={item} onLinkClick={() => {}} />
                        ))}
                      </div>
                    ))}
                  </nav>
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <Button onClick={toggleTheme} variant="ghost" className="w-full justify-start">
                      {theme === 'light' ? <Moon className="h-5 w-5 mr-2" /> : <Sun className="h-5 w-5 mr-2" />}
                      Switch Theme
                    </Button>
                    <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400">
                      <LogOut className={`h-5 w-5 mr-2 ${isLoggingOut ? 'animate-spin' : ''}`} />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-xl font-bold md:block hidden">{settings.crm_name}</h1>
              <span className="text-lg font-semibold text-gray-600 dark:text-gray-400 md:block hidden">/ <PageTitle /></span>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Zap className="w-4 h-4 mr-1" />
                    Quick Actions
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Calculators")}>
                      <Calculator className="w-4 h-4 mr-2" />
                      New Calculator
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Calendar")}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Link>
                  </DropdownMenuItem>
                  
                  {(settings?.trading_platform_url || customLinks.length > 0) && <DropdownMenuSeparator />}
                  
                  {settings?.trading_platform_url && (
                    <DropdownMenuItem asChild>
                      <a href={settings.trading_platform_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {settings.trading_platform_name || "Trading Platform"}
                      </a>
                    </DropdownMenuItem>
                  )}

                  {customLinks.map(link => (
                    <DropdownMenuItem key={link.id} asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {link.name}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Global Client Search - Desktop Only */}
              <div className="hidden lg:block max-w-sm">
                <GlobalClientSearch />
              </div>

              <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-800">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <span className="sr-only">Open user menu</span>
                    <UserCircle className="h-8 w-8 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                        {advisorProfile?.company_name || "Financial Advisor"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("HowTo")}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>How To</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                    <LogOut className={`mr-2 h-4 w-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Collapsible Sidebar */}
          <aside className={`hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`p-4 mb-4 ${isSidebarCollapsed ? 'px-2' : ''}`}>
                <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-r"
                        style={{
                          background: `linear-gradient(to right, var(--color-accent-gradient-from), var(--color-accent-gradient-to))`
                        }}
                    >
                        {settings.logo_url ? (
                            <img
                                src={settings.logo_url}
                                alt={`${settings.crm_name} logo`}
                                className="w-8 h-8 object-contain rounded"
                            />
                        ) : (
                            <FileText className="w-6 h-6 text-white" />
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="min-w-0">
                            <h2 className="font-bold text-gray-900 dark:text-gray-50 text-lg truncate">{settings.crm_name}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Financial Advisory CRM</p>
                        </div>
                    )}
                </div>
            </div>
            <nav className={`flex-1 overflow-y-auto space-y-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
              {filteredMenuItems.map((item) => (
                item.children ?
                    <NavGroup key={item.name} group={item} isCollapsed={isSidebarCollapsed} /> :
                    <NavLink key={item.name} item={item} isCollapsed={isSidebarCollapsed} />
              ))}
            </nav>
            <div className="mt-auto p-2 border-t border-gray-200 dark:border-gray-800">
                {/* User info section - hidden when collapsed */}
                <div className={`flex items-center gap-3 py-2 px-2 ${isSidebarCollapsed ? 'hidden' : ''}`}>
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm truncate">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{advisorProfile?.company_name || "Financial Advisor"}</p>
                    </div>
                </div>
                {/* Collapse button */}
                <div className="flex justify-center py-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-700"
                    >
                        {isSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
          </aside>

          <main className="flex-1 p-6 overflow-auto">
            <Suspense fallback={<div>Loading content...</div>}>
              {children}
            </Suspense>
          </main>
        </div>

        <div className="fixed bottom-6 right-6 z-50 group">
            <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none transform group-hover:-translate-y-2">
                Chat with Giuseppe
            </div>

            <Button
              onClick={() => setIsGiuseppeOpen(true)}
              className="rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:shadow-[0_10px_35px_rgba(96,165,250,0.5)]"
              aria-label="Open AI Assistant"
            >
              <Bot className="w-8 h-8 transition-transform duration-300 group-hover:rotate-12" />
            </Button>
        </div>
      </div>

      <GlobalSettingsModal
        isOpen={showGlobalSettingsModal}
        onClose={() => setShowGlobalSettingsModal(false)}
        onSettingsUpdate={handleSettingsUpdate}
        user={user}
      />

      <GiuseppeBot
        isOpen={isGiuseppeOpen}
        onClose={() => setIsGiuseppeOpen(false)}
      />
    </div>
  );
}

