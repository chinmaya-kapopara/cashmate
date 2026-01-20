"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, ArrowDown, ArrowUp, ArrowDownCircle, ArrowUpCircle, Home as HomeIcon, BarChart3, Wallet, User, Users, Search, Calendar, ChevronDown, History, Trash2, MoreVertical, Pencil, Settings as SettingsIcon, Bell, Shield, HelpCircle, Info, ArrowLeft, Mail, X, CalendarDays, LogOut, Activity, Lock, Eye, EyeOff } from "lucide-react";
import LandingPage from "@/components/landing-page";

// Categories removed - using initials/avatars instead

// Family members will be loaded from Supabase

// Helper function to format date consistently
const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Helper function to format date and time
const formatDateTime = (date: Date): string => {
  // Format: "Jan 19, 2026, 12:59 PM"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

// Helper function to format user name properly
const formatUserName = (name: string | null, email: string): string => {
  if (name) {
    // Capitalize first letter of each word
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  // Fallback to email username, capitalized
  const username = email.split('@')[0];
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
};

// Initial sample transaction data (only used for type inference)
// Dates are created inside a function to avoid hydration mismatches
const getInitialTransactions = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return [
    { 
      id: 1, 
      name: "Upwork", 
      date: formatDateDisplay(today), 
      amount: 850.00, 
      type: "income" as const,
      addedBy: "You",
      timestamp: new Date().getTime()
    },
    { 
      id: 2, 
      name: "Transfer", 
      date: formatDateDisplay(yesterday), 
      amount: 85.00, 
      type: "expense" as const,
      addedBy: "Family Member 1",
      timestamp: new Date().getTime() - 86400000
    },
    { 
      id: 3, 
      name: "Paypal", 
      date: "Jan 30, 2022", 
      amount: 1406.00, 
      type: "income" as const,
      addedBy: "You",
      timestamp: new Date("2022-01-30").getTime()
    },
    { 
      id: 4, 
      name: "Youtube", 
      date: "Jan 16, 2022", 
      amount: 11.99, 
      type: "expense" as const,
      addedBy: "Family Member 2",
      timestamp: new Date("2022-01-16").getTime()
    },
    {
      id: 5,
      name: "Grocery Shopping",
      date: "Jan 15, 2022",
      amount: 245.50,
      type: "expense" as const,
      addedBy: "You",
      timestamp: new Date("2022-01-15").getTime()
    },
    {
      id: 6,
      name: "Uber Ride",
      date: "Jan 14, 2022",
      amount: 125.00,
      type: "expense" as const,
      addedBy: "Family Member 1",
      timestamp: new Date("2022-01-14").getTime()
    },
  ];
};

const initialTransactions = getInitialTransactions();

type Transaction = typeof initialTransactions[0];

type Book = {
  id: number;
  name: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLandingPage, setShowLandingPage] = useState(true); // Start with true to ensure it shows
  const [activeTab, setActiveTab] = useState("home");
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [editingMemberEmail, setEditingMemberEmail] = useState<string>("");
  const [editingMemberName, setEditingMemberName] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"owner" | "admin" | "editor" | "viewer">("viewer");
  const [isLastOwner, setIsLastOwner] = useState(false);
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const [bookMembers, setBookMembers] = useState<Array<{email: string; role: string; name?: string}>>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isDeleteMemberConfirmOpen, setIsDeleteMemberConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string>("");
  const [activities, setActivities] = useState<Array<{
    id: number;
    book_id: number;
    user_email: string;
    user_name: string | null;
    activity_type: string;
    description: string;
    metadata: any;
    created_at: string;
  }>>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Check if it's first launch or PWA launch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if app is launched as PWA (standalone mode)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');
    
    // If it's a PWA, always show landing page
    if (isPWA) {
      setShowLandingPage(true);
      return;
    }
    
    // For regular browser mode, check if it's first launch
    let hasSeenLanding = false;
    try {
      // Check if it's the first time opening the app
      // Use try-catch to handle incognito mode or localStorage restrictions
      hasSeenLanding = !!localStorage.getItem('hasSeenLandingPage');
    } catch (error) {
      // If localStorage is not available (e.g., some incognito modes), treat as first visit
      // Landing page will show since we start with showLandingPage = true
      hasSeenLanding = false;
    }
    
    // For regular browser mode:
    // Show landing page only on first launch
    if (!hasSeenLanding) {
      setShowLandingPage(true);
      try {
        localStorage.setItem('hasSeenLandingPage', 'true');
      } catch (error) {
        // Ignore localStorage errors in incognito mode
        // Landing page will still show
      }
    } else {
      // User has seen it before in regular browser, so hide it
      setShowLandingPage(false);
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get fresh session to ensure we have latest user metadata
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          setUser(session.user);
        } else {
          window.location.href = "/auth";
          return;
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        window.location.href = "/auth";
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        window.location.href = "/auth";
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [originalTransactionValues, setOriginalTransactionValues] = useState<{
    name: string;
    amount: number;
    type: "income" | "expense";
    addedBy: string;
    date: string;
  } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRenameBookDialogOpen, setIsRenameBookDialogOpen] = useState(false);
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [originalBookName, setOriginalBookName] = useState<string>("");
  const [openBookMenuId, setOpenBookMenuId] = useState<number | null>(null);
  const [isDeleteBookConfirmOpen, setIsDeleteBookConfirmOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<number | null>(null);
  const [bookToDeleteName, setBookToDeleteName] = useState<string>("");
  const [deleteBookConfirmationText, setDeleteBookConfirmationText] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookRoles, setBookRoles] = useState<Record<number, string>>({}); // Store role for each book
  // Initialize selectedBookId from localStorage if available
  const [selectedBookId, setSelectedBookId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedBookId');
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);
  
  // Save selectedBookId to localStorage whenever it changes
  useEffect(() => {
    if (selectedBookId && typeof window !== 'undefined') {
      localStorage.setItem('selectedBookId', selectedBookId.toString());
    } else if (selectedBookId === null && typeof window !== 'undefined') {
      localStorage.removeItem('selectedBookId');
    }
  }, [selectedBookId]);

  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("allTime");
  const [typeFilter, setTypeFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [isMemberFilterOpen, setIsMemberFilterOpen] = useState(false);
  const [isPartyFilterOpen, setIsPartyFilterOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pendingDateFilter, setPendingDateFilter] = useState<string | null>(null);
  const [isAddPartyDialogOpen, setIsAddPartyDialogOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [isRenamePartyDialogOpen, setIsRenamePartyDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<string>("");
  const [originalPartyName, setOriginalPartyName] = useState<string>("");
  const [openPartyMenu, setOpenPartyMenu] = useState<string | null>(null);
  const [isDeletePartyConfirmOpen, setIsDeletePartyConfirmOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<string>("");
  const [deletePartyConfirmationText, setDeletePartyConfirmationText] = useState<string>("");
  const [isPartySelectorOpen, setIsPartySelectorOpen] = useState(false);
  const [partySelectorContext, setPartySelectorContext] = useState<"add" | "edit">("add");
  const [isAmountEditing, setIsAmountEditing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "Chinmay Kapopara",
    email: user?.email || "kapopara.king@gmail.com",
  });
  const [originalProfileData, setOriginalProfileData] = useState({
    name: "Chinmay Kapopara",
    email: user?.email || "kapopara.king@gmail.com",
  });
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const isCreatingBookRef = useRef(false);
  // Helper to get IST date string
  const getISTDateString = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const istTime = new Date(utcTime + istOffset);
    return istTime.toISOString().split("T")[0];
  };

  // Helper to convert YYYY-MM-DD to dd-mm-yyyy
  const formatDateToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  // Helper to convert dd-mm-yyyy to YYYY-MM-DD
  const parseDDMMYYYYToISO = (dateString: string): string => {
    if (!dateString) return "";
    // Remove any non-digit characters except dashes
    const cleaned = dateString.replace(/[^\d-]/g, "");
    const parts = cleaned.split("-").filter(p => p.length > 0);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Validate and pad
      const d = day.padStart(2, "0");
      const m = month.padStart(2, "0");
      const y = year;
      // Validate that we have a complete date
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        // Validate date
        const date = new Date(`${y}-${m}-${d}`);
        if (date instanceof Date && !isNaN(date.getTime())) {
          // Check if the date components match (to catch invalid dates like 31-02-2024)
          const checkDay = date.getDate().toString().padStart(2, "0");
          const checkMonth = (date.getMonth() + 1).toString().padStart(2, "0");
          const checkYear = date.getFullYear().toString();
          if (checkDay === d && checkMonth === m && checkYear === y) {
            return `${y}-${m}-${d}`;
          }
        }
      }
    }
    return ""; // Return empty string if parsing fails
  };

  // Helper function to get current user's name
  const getCurrentUserName = () => {
    return user?.user_metadata?.name || profileData.name || user?.email?.split('@')[0] || "User";
  };

  // Helper function to log activity
  // bookId parameter allows logging activity for a specific book (e.g., when deleting a book)
  const logActivity = async (
    activityType: string,
    description: string,
    metadata?: any,
    bookId?: number
  ) => {
    // Use provided bookId or fall back to selectedBookId
    const targetBookId = bookId || selectedBookId;
    if (!targetBookId || !user?.email) return;

    try {
      await supabase.rpc('log_activity', {
        p_book_id: targetBookId,
        p_user_email: user.email,
        p_user_name: getCurrentUserName(),
        p_activity_type: activityType,
        p_description: description,
        p_metadata: metadata || null
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't show error to user, activity logging is non-critical
    }
  };

  // Handle password change with old password verification
  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsChangingPassword(true);
    try {
      // First, verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.oldPassword,
      });

      if (signInError) {
        // Check if it's an invalid credentials error
        if (signInError.message?.toLowerCase().includes('invalid') || 
            signInError.message?.toLowerCase().includes('incorrect') ||
            signInError.message?.toLowerCase().includes('wrong')) {
          toast.error("Current password is incorrect");
        } else {
          toast.error(signInError.message || "Failed to verify current password");
        }
        setIsChangingPassword(false);
        return;
      }

      // If old password is correct, update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error(error.message || 'Failed to change password. Please try again.');
        setIsChangingPassword(false);
        return;
      }

      toast.success("Password changed successfully");
      setIsPasswordChangeModalOpen(false);
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      // Only log unexpected errors
      if (error.message && !error.message.includes('incorrect') && !error.message.includes('Current password')) {
        console.error('Unexpected error changing password:', error);
      }
      toast.error(error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setBrowserNotificationsEnabled(true);
        localStorage.setItem('browserNotificationsEnabled', 'true');
        localStorage.setItem('notificationPermission', permission);
        toast.success('Browser notifications enabled');
      } else if (permission === 'denied') {
        setBrowserNotificationsEnabled(false);
        localStorage.setItem('browserNotificationsEnabled', 'false');
        localStorage.setItem('notificationPermission', permission);
        toast.error('Notification permission was denied. Please enable it in your browser settings.');
      } else {
        setBrowserNotificationsEnabled(false);
        localStorage.setItem('browserNotificationsEnabled', 'false');
        localStorage.setItem('notificationPermission', permission);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  // Show browser notification
  const showBrowserNotification = (message: string, activityId?: number) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!browserNotificationsEnabled) return;

    try {
      const notification = new Notification('CashMate', {
        body: message,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: activityId?.toString(),
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  };

  // Fetch activities for the current book
  const fetchActivities = useCallback(async () => {
    if (!selectedBookId) {
      setActivities([]);
      return;
    }

    setActivitiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('book_id', selectedBookId)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to last 100 activities

      if (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
      } else {
        setActivities(data || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [selectedBookId]);

  // Helper function to format activity notification message
  const formatActivityNotification = (activity: any): string => {
    const userName = activity.user_name || activity.user_email?.split('@')[0] || 'Someone';
    const formattedName = userName.split(' ').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    
    // Format based on activity type
    switch (activity.activity_type) {
      case 'transaction_added':
        return `${formattedName} added a transaction`;
      case 'transaction_updated':
        return `${formattedName} updated a transaction`;
      case 'transaction_deleted':
        return `${formattedName} deleted a transaction`;
      case 'member_added':
        return `${formattedName} added a member`;
      case 'member_removed':
        return `${formattedName} removed a member`;
      case 'member_role_changed':
        return `${formattedName} changed a member's role`;
      case 'party_added':
        return `${formattedName} added a party`;
      case 'party_updated':
        return `${formattedName} updated a party`;
      case 'party_deleted':
        return `${formattedName} deleted a party`;
      case 'book_created':
        return `${formattedName} created a book`;
      case 'book_updated':
        return `${formattedName} updated the book`;
      case 'book_deleted':
        return `${formattedName} deleted a book`;
      default:
        return `${formattedName}: ${activity.description}`;
    }
  };

  // Helper function to check if error is a permission/RLS error
  const isPermissionError = (error: any): boolean => {
    if (!error) return false;
    
    // Check for common RLS/permission error codes and messages
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';
    
    // Supabase RLS errors
    if (errorCode === '42501' || errorCode === 'PGRST301' || errorCode === 'PGRST116') {
      return true;
    }
    
    // Check error message for permission-related keywords
    const permissionKeywords = [
      'permission denied',
      'row-level security',
      'policy violation',
      'access denied',
      'unauthorized',
      'forbidden',
      'insufficient privileges'
    ];
    
    return permissionKeywords.some(keyword => errorMessage.includes(keyword));
  };

  // Helper function to handle permission errors with UI refresh
  const handlePermissionError = async (error: any, operation: string) => {
    if (isPermissionError(error)) {
      toast.error(`You don't have permission to ${operation}. Your role may have changed. Refreshing...`);
      
      // Refresh UI to get latest permissions
      if (selectedBookId) {
        // Refresh book roles
        const { data: memberData } = await supabase
          .from('book_members')
          .select('role')
          .eq('book_id', selectedBookId)
          .eq('user_email', user?.email)
          .single();
        
        if (memberData) {
          setBookRoles(prev => ({
            ...prev,
            [selectedBookId]: memberData.role
          }));
        }
        
        // Refresh transactions and parties
        await fetchTransactions();
        await fetchParties();
      }
      
      return true; // Indicates permission error was handled
    }
    return false; // Not a permission error
  };

  // Get current user's role for the selected book
  const getUserRoleForBook = useCallback(async (bookId: number): Promise<string | null> => {
    if (!user?.email || !bookId) return null;
    
    try {
      const { data, error } = await supabase
        .from('book_members')
        .select('role')
        .eq('book_id', bookId)
        .eq('user_email', user.email)
        .single();
      
      if (error || !data) return null;
      return data.role;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }, [user?.email]);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    addedBy: getCurrentUserName(),
    party: "",
    date: getISTDateString(),
  });
  const [newBookName, setNewBookName] = useState("");

  // Fetch books from Supabase - only books the user has access to
  const fetchBooks = useCallback(async () => {
    if (!user?.email) {
      setBooks([]);
      setBooksLoading(false);
      return;
    }

    setBooksLoading(true);
    try {
      // First, get all book IDs where the user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('book_members')
        .select('book_id')
        .eq('user_email', user.email);
      
      if (memberError) {
        console.error('Error fetching user book memberships:', memberError);
        setBooks([]);
        setBooksLoading(false);
        return;
      }

      // If user has no book memberships, show no books
      if (!memberData || memberData.length === 0) {
        setBooks([]);
        setSelectedBookId(null);
        setBooksLoading(false);
        return;
      }

      // Extract book IDs
      const bookIds = memberData.map(m => m.book_id);

      // Fetch only books the user has access to
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .in('id', bookIds)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching books:', error);
        setBooks([]);
        setBookRoles({});
      } else if (data) {
        setBooks(data);
        
        // Fetch user's role for each book
        const rolesMap: Record<number, string> = {};
        await Promise.all(
          data.map(async (book) => {
            const { data: memberData } = await supabase
              .from('book_members')
              .select('role')
              .eq('book_id', book.id)
              .eq('user_email', user.email)
              .single();
            
            if (memberData) {
              rolesMap[book.id] = memberData.role;
            }
          })
        );
        setBookRoles(rolesMap);
        
        // Validate and update selected book - ensure it's still accessible
        setSelectedBookId((prevId) => {
          // First, try to get from localStorage (for page refresh)
          let targetId = prevId;
          if (!targetId && typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedBookId');
            if (saved) {
              targetId = parseInt(saved, 10);
            }
          }
          
          // Check if target book is still accessible
          if (targetId) {
            const isAccessible = data.some(book => book.id === targetId);
            if (isAccessible) {
              // Save to localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('selectedBookId', targetId.toString());
              }
              return targetId;
            } else {
              // Book is no longer accessible - clear it and show notification
              console.log('Selected book no longer accessible, switching to first available');
              if (typeof window !== 'undefined') {
                localStorage.removeItem('selectedBookId');
              }
              
              // Show toast notification
              toast.warning('You no longer have access to the selected book. Switching to another book.');
            }
          }
          
          // Fallback to first book if no valid selection
          const firstBookId = data.length > 0 ? data[0].id : null;
          if (firstBookId && typeof window !== 'undefined') {
            localStorage.setItem('selectedBookId', firstBookId.toString());
          }
          return firstBookId;
        });
      } else {
        setBooks([]);
        setBookRoles({});
        setSelectedBookId(null);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    } finally {
      setBooksLoading(false);
    }
  }, [user?.email]);

  // Fetch transactions from Supabase
  const fetchTransactions = useCallback(async (bookId?: number) => {
    const targetBookId = bookId || selectedBookId;
    
    // Always set loading to false if we're not going to fetch
    if (!targetBookId || !user?.email) {
      setLoading(false);
      return;
    }
    
    // Skip if we're creating a book and this is not the new book ID
    if (isCreatingBookRef.current && bookId === undefined) {
      setLoading(false);
      return;
    }
    
    try {
      // Validate user still has access to this book before fetching transactions
      const { data: memberCheck } = await supabase
        .from('book_members')
        .select('book_id')
        .eq('book_id', targetBookId)
        .eq('user_email', user.email)
        .single();
      
      if (!memberCheck) {
        // User no longer has access to this book
        console.log('User no longer has access to book', targetBookId, '- clearing transactions');
        setTransactions([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('book_id', targetBookId)
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } else if (data) {
        // Map Supabase data to Transaction type
        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          date: t.date,
          amount: parseFloat(t.amount),
          type: t.type as "income" | "expense",
          addedBy: t.added_by,
          party: t.party || undefined,
          timestamp: t.timestamp,
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBookId, user?.email]);

  // Fetch user profile from Supabase
  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      if (!user?.email) return;
      
      // Get name from user_metadata
      const name = user.user_metadata?.name || user.email?.split('@')[0] || "User";
      
      setProfileData({
        name: name,
        email: user.email || "",
      });
      setOriginalProfileData({
        name: name,
        email: user.email || "",
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch book members from Supabase
  const fetchBookMembers = useCallback(async () => {
    if (!selectedBookId || !user?.email) return;
    
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_members')
        .select('user_email, role')
        .eq('book_id', selectedBookId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching book members:', error);
        setBookMembers([]);
      } else if (data) {
        // Fetch user names for each member using database function
        const membersWithNames = await Promise.all(
          data.map(async (member: any) => {
            // Use database function to get user name from auth.users metadata
            const { data: nameData, error: nameError } = await supabase
              .rpc('get_user_name', { p_user_email: member.user_email });
            
            const name = nameError ? member.user_email.split('@')[0] : (nameData || member.user_email.split('@')[0]);
            
            return {
              email: member.user_email,
              role: member.role,
              name: name,
            };
          })
        );
        setBookMembers(membersWithNames);
      }
    } catch (error) {
      console.error('Error fetching book members:', error);
      setBookMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [selectedBookId, user?.email]);

  // Add member to book
  const addBookMember = async (email: string, role: "owner" | "admin" | "editor" | "viewer") => {
    if (!selectedBookId || !user?.email) {
      toast.error("Please select a book and ensure you're logged in");
      return;
    }

    // Check if user has permission to add members (owner, admin only)
    const currentUserRole = bookRoles[selectedBookId];
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      toast.error("You don't have permission to add members");
      return;
    }

    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('book_members')
        .select('user_email')
        .eq('book_id', selectedBookId)
        .eq('user_email', email)
        .single();

      if (existing) {
        toast.error("This user already has access to this book");
        return;
      }

      const { error } = await supabase
        .from('book_members')
        .insert({
          book_id: selectedBookId,
          user_email: email,
          role: role,
        });

      if (error) {
        // Check if it's a permission error first
        const isPermissionErr = await handlePermissionError(error, 'add members');
        if (isPermissionErr) {
          return;
        }
        throw error;
      }

      // Get book name and inviter name for email
      const selectedBook = books.find(b => b.id === selectedBookId);
      const bookName = selectedBook?.name || 'the book';
      const inviterName = getCurrentUserName();
      const inviterEmail = user.email;

      // Send invitation email via Edge Function
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-member-invitation', {
          body: {
            inviteeEmail: email,
            inviterName: inviterName,
            inviterEmail: inviterEmail,
            bookName: bookName,
            role: role,
          },
        });

        if (emailError) {
          console.error('Error sending invitation email:', emailError);
          toast.success("Member added successfully!");
          toast.info(`Invitation email could not be sent to ${email}. Member was still added.`);
        } else {
          toast.success(`Member added successfully! Invitation email sent to ${email}.`);
        }
      } catch (emailErr: any) {
        console.error('Error calling invitation email function:', emailErr);
        toast.success("Member added successfully!");
        toast.info(`Invitation email could not be sent to ${email}. Member was still added.`);
      }

      await fetchBookMembers();
      setIsAddMemberModalOpen(false);
      setNewMemberEmail("");
      setSelectedRole("viewer");
      
      // Log activity
      await logActivity('member_added', `Added ${role} member: ${email}`, {
        member_email: email,
        role: role
      });
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || "Failed to add member");
    }
  };

  // Update member role
  const updateMemberRole = async (email: string, role: "owner" | "admin" | "editor" | "viewer") => {
    if (!selectedBookId || !user?.email) {
      toast.error("Please select a book and ensure you're logged in");
      return;
    }

    const isSelfChange = email === user.email;

    try {
      // Get current user's role and the member being edited
      const [currentUserRoleData, memberData] = await Promise.all([
        supabase
          .from('book_members')
          .select('role')
          .eq('book_id', selectedBookId)
          .eq('user_email', user.email)
          .single(),
        supabase
          .from('book_members')
          .select('role')
          .eq('book_id', selectedBookId)
          .eq('user_email', email)
          .single()
      ]);

      const currentUserRole = currentUserRoleData.data?.role;
      const currentMemberRole = memberData.data?.role;

      // If changing own role, allow it but enforce role hierarchy (cannot promote)
      // If changing someone else's role, only owners can do it
      if (isSelfChange) {
        // Role hierarchy: Owner (4) > Admin (3) > Editor (2) > Viewer (1)
        const roleHierarchy: Record<string, number> = {
          owner: 4,
          admin: 3,
          editor: 2,
          viewer: 1
        };
        
        const currentRoleLevel = roleHierarchy[currentMemberRole] || 1;
        const newRoleLevel = roleHierarchy[role] || 1;
        
        // Users can only change to their current role or lower (cannot promote themselves)
        if (newRoleLevel > currentRoleLevel) {
          toast.error("You cannot promote yourself to a higher role. You can only change to your current role or a lower role.");
          return;
        }
      } else {
        // Changing someone else's role - only owners can do it
        if (currentUserRole !== 'owner') {
          toast.error("Only book owners can change other members' roles");
          return;
        }
      }

      // If changing an owner's role (self or other), check if it's the last owner
      if (currentMemberRole === 'owner' && role !== 'owner') {
        // Count how many owners exist
        const { data: ownersData, error: countError } = await supabase
          .from('book_members')
          .select('user_email')
          .eq('book_id', selectedBookId)
          .eq('role', 'owner');

        if (countError) {
          console.error('Error counting owners:', countError);
          toast.error("Failed to verify owner count");
          return;
        }

        if (!ownersData || ownersData.length <= 1) {
          toast.error("Cannot change the last owner's role. There must be at least one owner.");
          return;
        }
      }

      const { error } = await supabase
        .from('book_members')
        .update({ role: role, updated_at: new Date().toISOString() })
        .eq('book_id', selectedBookId)
        .eq('user_email', email);

      if (error) {
        // Check if it's a permission error first
        const isPermissionErr = await handlePermissionError(error, 'update member roles');
        if (isPermissionErr) {
          return;
        }
        throw error;
      }

      toast.success(isSelfChange ? "Your role has been updated successfully!" : "Role updated successfully!");
      await fetchBookMembers();
      
      // Log activity (capture values before clearing state)
      const memberName = editingMemberName || email;
      await logActivity('member_role_changed', isSelfChange 
        ? `Changed own role from ${currentMemberRole} to ${role}`
        : `Changed ${memberName}'s role from ${currentMemberRole} to ${role}`, {
        member_email: email,
        old_role: currentMemberRole,
        new_role: role,
        is_self_change: isSelfChange
      });
      
      setIsEditRoleModalOpen(false);
      setEditingMemberEmail("");
      setEditingMemberName("");
      setSelectedRole("viewer");
    } catch (error: any) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'update member roles');
      if (!isPermissionErr) {
        console.error('Error updating role:', error);
        toast.error(error.message || "Failed to update role");
      }
    }
  };

  // Remove member from book
  const removeBookMember = async (email: string) => {
    if (!selectedBookId || !user?.email) {
      toast.error("Please select a book and ensure you're logged in");
      return;
    }

    const isSelfRemoval = email === user.email;

    try {
      // Check if the member being removed is an owner
      const { data: memberData, error: fetchError } = await supabase
        .from('book_members')
        .select('role')
        .eq('book_id', selectedBookId)
        .eq('user_email', email)
        .single();

      if (fetchError || !memberData) {
        toast.error("Member not found");
        return;
      }

      // If removing an owner, check if it's the last owner
      if (memberData.role === 'owner') {
        // Count how many owners exist
        const { data: ownersData, error: countError } = await supabase
          .from('book_members')
          .select('user_email')
          .eq('book_id', selectedBookId)
          .eq('role', 'owner');

        if (countError) {
          console.error('Error counting owners:', countError);
          toast.error("Failed to verify owner count");
          return;
        }

        if (!ownersData || ownersData.length <= 1) {
          toast.error("Cannot remove the last owner. There must be at least one owner.");
          return;
        }
      }

      // If removing someone else, check permissions (only owners/admins can remove others)
      if (!isSelfRemoval) {
        const currentUserRole = bookRoles[selectedBookId];
        if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
          toast.error("You don't have permission to remove members");
          return;
        }
      }

      const { error } = await supabase
        .from('book_members')
        .delete()
        .eq('book_id', selectedBookId)
        .eq('user_email', email);

      if (error) {
        // Check if it's a permission error first
        const isPermissionErr = await handlePermissionError(error, 'remove members');
        if (isPermissionErr) {
          return;
        }
        throw error;
      }

      toast.success(isSelfRemoval ? "You have left the book successfully!" : "Member removed successfully!");
      await fetchBookMembers();
      setIsDeleteMemberConfirmOpen(false);
      setMemberToDelete("");
      
      // Log activity
      await logActivity('member_removed', isSelfRemoval ? `Left the book: ${email}` : `Removed member: ${email}`, {
        member_email: email,
        is_self_removal: isSelfRemoval
      });
      
      // If user removed themselves, refresh books list
      if (isSelfRemoval) {
        await fetchBooks();
      }
    } catch (error: any) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'remove members');
      if (!isPermissionErr) {
        console.error('Error removing member:', error);
        toast.error(error.message || "Failed to remove member");
      }
    }
  };

  // Fetch family members from Supabase

  const fetchParties = useCallback(async () => {
    if (!selectedBookId || !user?.email) {
      setParties([]);
      return;
    }
    
    try {
      // First verify user has access to this book
      const { data: memberCheck } = await supabase
        .from('book_members')
        .select('book_id')
        .eq('book_id', selectedBookId)
        .eq('user_email', user.email)
        .single();
      
      if (!memberCheck) {
        // User doesn't have access, clear parties
        setParties([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('parties')
        .select('name')
        .eq('book_id', selectedBookId)
        .order('name');
      
      if (error) {
        // Check if it's a permission error
        const isPermissionErr = await handlePermissionError(error, 'fetch parties');
        if (!isPermissionErr) {
          console.error('Error fetching parties:', error);
        }
        setParties([]);
      } else if (data) {
        setParties(data.map((p: any) => p.name));
      } else {
        setParties([]);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      setParties([]);
    }
  }, [selectedBookId, user?.email]);

  const handleAddParty = async () => {
    if (!selectedBookId) {
      toast.error("Please select a book");
      return;
    }

    // Check if user has permission to add parties (owner, admin, editor only)
    const currentUserRole = bookRoles[selectedBookId];
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin' && currentUserRole !== 'editor') {
      toast.error("You don't have permission to add parties");
      return;
    }

    if (!newPartyName.trim()) {
      toast.error("Please enter a party name");
      return;
    }

    if (newPartyName.length > 30) {
      toast.error("Party name cannot exceed 30 characters");
      return;
    }

    // Check for duplicate party name (case-insensitive)
    const trimmedName = newPartyName.trim();
    const duplicateParty = parties.find(
      party => party.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (duplicateParty) {
      toast.error("A party with this name already exists");
      return;
    }

    try {
      const { error } = await supabase
        .from('parties')
        .insert([{ name: trimmedName, book_id: selectedBookId }]);

      if (error) {
        // Check if it's a permission error first
        const isPermissionErr = await handlePermissionError(error, 'add parties');
        if (isPermissionErr) {
          return;
        }
        
        if (error.code === '23505') { // Unique constraint violation
          toast.error("A party with this name already exists");
        } else {
          console.error('Error adding party:', error);
          toast.error('Failed to add party. Please try again.');
        }
        return;
      }

      toast.success("Party added successfully");
      setNewPartyName("");
      setIsAddPartyDialogOpen(false);
      fetchParties();
      // Set the newly added party in formData
      setFormData({ ...formData, party: trimmedName });
      
      // Log activity
      await logActivity('party_added', `Added party: ${trimmedName}`, {
        party_name: trimmedName
      });
    } catch (error: any) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'add parties');
      if (!isPermissionErr) {
        console.error('Error adding party:', error);
        toast.error('Failed to add party. Please try again.');
      }
    }
  };

  const handleRenameParty = async () => {
    if (!editingParty || !newPartyName.trim()) {
      toast.error("Please enter a party name");
      return;
    }

    if (!selectedBookId) {
      toast.error("Please select a book");
      return;
    }

    // Check if user has permission to edit parties (owner, admin, editor only)
    const currentUserRole = bookRoles[selectedBookId];
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin' && currentUserRole !== 'editor') {
      toast.error("You don't have permission to edit parties");
      return;
    }

    if (newPartyName.length > 30) {
      toast.error("Party name cannot exceed 30 characters");
      return;
    }

    if (newPartyName.trim() === originalPartyName.trim()) {
      toast.error("Party name is unchanged");
      return;
    }

    // Check for duplicate party name within the same book (case-insensitive, excluding current party)
    const trimmedName = newPartyName.trim();
    const duplicateParty = parties.find(
      party => party.toLowerCase() === trimmedName.toLowerCase() && party !== originalPartyName
    );
    
    if (duplicateParty) {
      toast.error("A party with this name already exists in this book");
      return;
    }

    if (!selectedBookId) {
      toast.error("Please select a book");
      return;
    }

    try {
      // First, get the party ID from the database (filtered by book_id)
      const { data: partyData, error: fetchError } = await supabase
        .from('parties')
        .select('id')
        .eq('name', originalPartyName)
        .eq('book_id', selectedBookId)
        .single();

      if (fetchError || !partyData) {
        console.error('Error fetching party:', fetchError);
        toast.error('Failed to find party. Please try again.');
        return;
      }

      // Update the party name
      const { error } = await supabase
        .from('parties')
        .update({ name: newPartyName.trim() })
        .eq('id', partyData.id)
        .eq('book_id', selectedBookId);

      if (error) {
        // Check if it's a permission error first
        const isPermissionErr = await handlePermissionError(error, 'edit parties');
        if (isPermissionErr) {
          return;
        }
        
        if (error.code === '23505') { // Unique constraint violation
          toast.error("Party name already exists");
        } else {
          console.error('Error renaming party:', error);
          toast.error('Failed to rename party. Please try again.');
        }
        return;
      }

      // Update transactions that use this party (only for the current book)
      const { error: updateTransactionsError } = await supabase
        .from('transactions')
        .update({ party: newPartyName.trim() })
        .eq('party', originalPartyName)
        .eq('book_id', selectedBookId);

      if (updateTransactionsError) {
        console.error('Error updating transactions:', updateTransactionsError);
        toast.error('Party renamed but failed to update some transactions. Please refresh the page.');
      }

      toast.success("Party renamed successfully");
      setNewPartyName("");
      setEditingParty("");
      setOriginalPartyName("");
      setIsRenamePartyDialogOpen(false);
      fetchParties();
      // Refresh transactions to show updated party names
      fetchTransactions();
      
      // Update party filter if it was set to the old name
      if (partyFilter === originalPartyName) {
        setPartyFilter(newPartyName.trim());
      }
      
      // Update formData if the renamed party is currently selected
      if (formData.party === originalPartyName) {
        setFormData({ ...formData, party: newPartyName.trim() });
      }
      
      // Log activity
      await logActivity('party_renamed', `Renamed party from "${originalPartyName}" to "${newPartyName.trim()}"`, {
        old_name: originalPartyName,
        new_name: newPartyName.trim()
      });
    } catch (error: any) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'edit parties');
      if (!isPermissionErr) {
        console.error('Error renaming party:', error);
        toast.error('Failed to rename party. Please try again.');
      }
    }
  };

  const handleDeleteParty = async () => {
    if (!partyToDelete || !selectedBookId) return;

    // Check if user has permission to delete parties (owner, admin only)
    const currentUserRole = bookRoles[selectedBookId];
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      toast.error("You don't have permission to delete parties");
      setIsDeletePartyConfirmOpen(false);
      setPartyToDelete("");
      return;
    }

    try {
      // First, get the party ID from the database (filtered by book_id)
      const { data: partyData, error: fetchError } = await supabase
        .from('parties')
        .select('id')
        .eq('name', partyToDelete)
        .eq('book_id', selectedBookId)
        .single();

      if (fetchError || !partyData) {
        console.error('Error fetching party:', fetchError);
        toast.error('Failed to find party. Please try again.');
        return;
      }

      // Remove party from all transactions that use it (only for the current book)
      await supabase
        .from('transactions')
        .update({ party: null })
        .eq('party', partyToDelete)
        .eq('book_id', selectedBookId);

      // Delete the party
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', partyData.id)
        .eq('book_id', selectedBookId);

      if (error) {
        // Check if it's a permission error first
        const isPermissionErr = await handlePermissionError(error, 'delete parties');
        if (isPermissionErr) {
          return;
        }
        
        console.error('Error deleting party:', error);
        toast.error('Failed to delete party. Please try again.');
        return;
      }

      toast.success('Party deleted successfully');
      setIsDeletePartyConfirmOpen(false);
      setPartyToDelete("");
      fetchParties();
      // Refresh transactions to show updated party values
      fetchTransactions();
      
      // Reset party filter if it was set to the deleted party
      if (partyFilter === partyToDelete) {
        setPartyFilter("all");
      }
      
      // Log activity
      await logActivity('party_deleted', `Deleted party: ${partyToDelete}`, {
        party_name: partyToDelete
      });
    } catch (error: any) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'delete parties');
      if (!isPermissionErr) {
        console.error('Error deleting party:', error);
        toast.error('Failed to delete party. Please try again.');
      }
    }
  };

  const handleOpenRenameParty = (party: string) => {
    setEditingParty(party);
    setNewPartyName(party);
    setOriginalPartyName(party);
    setOpenPartyMenu(null);
    setIsRenamePartyDialogOpen(true);
  };

  const handleOpenDeleteParty = (party: string) => {
    setPartyToDelete(party);
    setDeletePartyConfirmationText("");
    setOpenPartyMenu(null);
    setIsDeletePartyConfirmOpen(true);
  };

  // Clean up transaction history entries where no actual update was made
  const cleanupTransactionHistory = async () => {
    try {
      // Fetch all 'updated' history entries
      const { data: historyEntries, error: fetchError } = await supabase
        .from('transaction_history')
        .select('id, old_values, new_values, change_type')
        .eq('change_type', 'updated');
      
      if (fetchError) {
        console.error('Error fetching transaction history:', fetchError);
        return;
      }
      
      if (!historyEntries || historyEntries.length === 0) {
        return;
      }
      
      // Find entries where old_values and new_values are identical (no actual change)
      const duplicateIds: number[] = [];
      
      historyEntries.forEach((entry) => {
        if (!entry.old_values || !entry.new_values) {
          return;
        }
        
        // Method 1: Compare JSON strings
        const oldValuesStr = JSON.stringify(entry.old_values);
        const newValuesStr = JSON.stringify(entry.new_values);
        
        // Method 2: Compare field by field for more accuracy
        const oldValues = entry.old_values as any;
        const newValues = entry.new_values as any;
        
        let allFieldsMatch = true;
        const fieldsToCheck = ['name', 'amount', 'type', 'added_by', 'party', 'date'];
        
        for (const field of fieldsToCheck) {
          if (oldValues[field] !== newValues[field]) {
            allFieldsMatch = false;
            break;
          }
        }
        
        // If old and new values are the same (by both methods), mark for deletion
        if (oldValuesStr === newValuesStr || allFieldsMatch) {
          duplicateIds.push(entry.id);
        }
      });
      
      // Delete duplicate entries in batches if needed
      if (duplicateIds.length > 0) {
        // Delete in chunks of 100 to avoid query size limits
        const chunkSize = 100;
        for (let i = 0; i < duplicateIds.length; i += chunkSize) {
          const chunk = duplicateIds.slice(i, i + chunkSize);
          const { error: deleteError } = await supabase
            .from('transaction_history')
            .delete()
            .in('id', chunk);
          
          if (deleteError) {
            console.error('Error deleting duplicate history entries:', deleteError);
          }
        }
        
        if (duplicateIds.length > 0) {
          console.log(`Cleaned up ${duplicateIds.length} duplicate transaction history entries`);
          toast.success(`Cleaned up ${duplicateIds.length} duplicate history entries`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up transaction history:', error);
    }
  };

  // Load data on component mount - fetch books when user is available
  useEffect(() => {
    if (user?.email) {
      fetchBooks();
    }
  }, [user?.email, fetchBooks]);

  // Fetch user profile when user is available
  // Only update if profile modal is not open (to prevent overwriting user's edits)
  useEffect(() => {
    if (user && !isProfileOpen) {
      fetchUserProfile();
    }
  }, [user, isProfileOpen]);

  // Initialize notification permission and browser notifications state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      try {
        const savedPermission = localStorage.getItem('notificationPermission') as 'default' | 'granted' | 'denied' | null;
        if (savedPermission) {
          setNotificationPermission(savedPermission);
        }
        
        const savedEnabled = localStorage.getItem('browserNotificationsEnabled');
        if (savedEnabled === 'true' && Notification.permission === 'granted') {
          setBrowserNotificationsEnabled(true);
        }
      } catch (error) {
        // Ignore localStorage errors (e.g., in incognito mode)
      }
    }
  }, []);

  // Refresh session periodically and on window focus to sync user metadata across tabs/windows
  useEffect(() => {
    if (!user) return;

    const checkAndRefreshSession = async (forceRefresh = false) => {
      try {
        let session;
        
        if (forceRefresh) {
          // Force refresh to get latest user metadata from server
          const { data, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          session = data.session;
        } else {
          // Just get current session (might be cached)
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          session = data.session;
        }
        
        if (session?.user) {
          // Check if metadata has changed
          const currentName = user.user_metadata?.name;
          const newName = session.user.user_metadata?.name;
          
          // Only update if profile modal is not open (to prevent overwriting user's edits)
          if (currentName !== newName && !isProfileOpen) {
            setUser(session.user);
            // fetchUserProfile will be called automatically via the useEffect above
          }
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    };

    // Refresh when window regains focus (force refresh to get latest data)
    const handleFocus = async () => {
      await checkAndRefreshSession(true);
      
      // Also refresh data that might have changed in other windows
      if (selectedBookId) {
        fetchTransactions();
        fetchParties();
        // Refresh book members on focus - use the existing fetchBookMembers function
        if (selectedBookId && user?.email) {
          // Inline fetch to avoid dependency issues
          setMembersLoading(true);
          try {
            const { data, error } = await supabase
              .from('book_members')
              .select('user_email, role')
              .eq('book_id', selectedBookId)
              .order('created_at', { ascending: true });
            
            if (error) {
              console.error('Error fetching book members:', error);
              setBookMembers([]);
            } else if (data) {
              const membersWithNames = await Promise.all(
                data.map(async (member: any) => {
                  const { data: nameData, error: nameError } = await supabase
                    .rpc('get_user_name', { p_user_email: member.user_email });
                  
                  const name = nameError ? member.user_email.split('@')[0] : (nameData || member.user_email.split('@')[0]);
                  
                  return {
                    email: member.user_email,
                    role: member.role,
                    name: name,
                  };
                })
              );
              setBookMembers(membersWithNames);
            }
          } catch (error) {
            console.error('Error fetching book members:', error);
            setBookMembers([]);
          } finally {
            setMembersLoading(false);
          }
        }
      }
    };

    // Check periodically (every 15 seconds) - use getSession for lighter check
    const interval = setInterval(() => {
      checkAndRefreshSession(false);
    }, 15000);

    window.addEventListener('focus', handleFocus);

    // Listen for storage events (Supabase stores session in localStorage)
    // This fires when another tab/window updates the session
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('supabase.auth.token')) {
        // Force refresh when storage changes to get latest data
        checkAndRefreshSession(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user, selectedBookId, fetchTransactions, fetchParties, isProfileOpen]);

  // Fetch parties when book changes
  useEffect(() => {
    if (selectedBookId) {
      fetchParties();
    } else {
      setParties([]);
    }
  }, [selectedBookId, fetchParties]);

  // Fetch transactions when book changes
  useEffect(() => {
    // Only fetch if we have both selectedBookId and user email
    if (selectedBookId && user?.email && !isCreatingBookRef.current) {
      setLoading(true);
      fetchTransactions();
    } else if (!selectedBookId) {
      // If no book is selected, clear transactions and stop loading
      setTransactions([]);
      setLoading(false);
    } else if (!user?.email) {
      // If user is not loaded yet, just stop loading (will fetch when user loads)
      setLoading(false);
    }
  }, [selectedBookId, user?.email, fetchTransactions]);

  // Subscribe to realtime transaction changes for the current book
  useEffect(() => {
    if (!selectedBookId) return;

    const channel = supabase
      .channel(`transactions:${selectedBookId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'transactions',
          filter: `book_id=eq.${selectedBookId}`,
        },
        (payload) => {
          console.log('Transaction change detected:', payload.eventType);
          // Refresh transactions when any change occurs
          fetchTransactions();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to transaction changes for book:', selectedBookId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to transaction changes:', err);
          // Don't show error to user - realtime is optional, app will work with polling
        } else if (status === 'TIMED_OUT') {
          console.warn('Transaction subscription timed out for book:', selectedBookId);
        } else if (status === 'CLOSED') {
          console.log('Transaction subscription closed for book:', selectedBookId);
        }
      });

    // Cleanup subscription when book changes or component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBookId, fetchTransactions]);

  // Store selectedBookId in a ref to access current value in realtime subscription
  const selectedBookIdRef = useRef(selectedBookId);
  useEffect(() => {
    selectedBookIdRef.current = selectedBookId;
  }, [selectedBookId]);

  // Store user email in a ref for activity notifications
  const userEmailRef = useRef(user?.email);
  useEffect(() => {
    userEmailRef.current = user?.email;
  }, [user?.email]);

  // Subscribe to realtime activity_log changes to show notifications
  useEffect(() => {
    if (!selectedBookId || !user?.email) return;

    const channel = supabase
      .channel(`activity_log:${selectedBookId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new activities
          schema: 'public',
          table: 'activity_log',
          filter: `book_id=eq.${selectedBookId}`,
        },
        (payload) => {
          const newActivity = (payload as any).new_record;
          if (!newActivity) return;
          
          // Don't show notification for current user's own activities
          if (newActivity.user_email === userEmailRef.current) {
            return;
          }

          // Format and show notification
          const notificationMessage = formatActivityNotification(newActivity);
          
          // Show notification with activity icon
          toast.info(notificationMessage, {
            icon: <Activity className="h-4 w-4" />,
            duration: 4000,
            action: {
              label: 'View',
              onClick: () => {
                setIsActivityModalOpen(true);
                fetchActivities();
              },
            },
          });

          // Refresh activities list
          fetchActivities();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to activity log changes for book:', selectedBookId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to activity log changes:', err);
          // Don't show error to user - realtime is optional
        } else if (status === 'TIMED_OUT') {
          console.warn('Activity log subscription timed out for book:', selectedBookId);
        } else if (status === 'CLOSED') {
          console.log('Activity log subscription closed for book:', selectedBookId);
        }
      });

    // Cleanup subscription when book changes or component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBookId, user?.email, fetchActivities]);

  // Subscribe to realtime book_members changes to refresh UI when role changes
  useEffect(() => {
    if (!user?.email) return;
    // Only subscribe if there are books - avoids errors when no books exist
    if (booksLengthRef.current === 0 && !booksLoadingRef.current) return;

    const channel = supabase
      .channel(`book_members:${user.email}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'book_members',
          filter: `user_email=eq.${user.email}`,
        },
        async (payload) => {
          console.log('Book member change detected for current user:', payload.eventType, payload);
          
          // Get current selectedBookId from ref to avoid stale closure
          const currentSelectedBookId = selectedBookIdRef.current;
          
          // Show notification to user about role change
          if (payload.eventType === 'UPDATE') {
            const oldRole = (payload as any).old_record?.role;
            const newRole = (payload as any).new_record?.role;
            if (oldRole && newRole && oldRole !== newRole) {
              toast.info(`Your role has been changed from ${oldRole} to ${newRole}. Refreshing UI...`);
            }
          } else if (payload.eventType === 'DELETE') {
            const removedBookId = (payload as any).old_record?.book_id;
            
            if (removedBookId) {
              // Fetch the book name before showing notification
              let removedBookName = 'a book';
              try {
                const { data: bookData } = await supabase
                  .from('books')
                  .select('name')
                  .eq('id', removedBookId)
                  .single();
                
                if (bookData) {
                  removedBookName = bookData.name;
                }
              } catch (error) {
                console.error('Error fetching book name:', error);
              }
              
              // Check if the removed book is the currently selected book
              // Convert to numbers for proper comparison (handle type mismatches)
              const removedId = typeof removedBookId === 'number' ? removedBookId : parseInt(String(removedBookId), 10);
              const currentSelectedId = typeof currentSelectedBookId === 'number' ? currentSelectedBookId : (currentSelectedBookId ? parseInt(String(currentSelectedBookId), 10) : null);
              
              console.log('DELETE event - removedBookId:', removedId, 'selectedBookId:', currentSelectedId);
              
              if (removedId === currentSelectedId) {
                // User was removed from the book they're currently viewing
                console.log('User removed from currently selected book, triggering hard refresh');
                toast.error(`Your access to "${removedBookName}" has been removed. Refreshing page...`);
                
                // Clear transactions immediately
                setTransactions([]);
                
                // Clear localStorage to remove the saved book selection
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('selectedBookId');
                }
                
                // Force a hard refresh after a short delay to show the toast
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                return; // Don't continue with the refresh logic, we're doing a hard refresh
              } else {
                // User was removed from a different book
                toast.warning(`Your access to "${removedBookName}" has been removed. Refreshing...`);
              }
            }
          } else if (payload.eventType === 'INSERT') {
            toast.success('You have been added to a book. Refreshing...');
          }
          
          // First, refresh books list (user might have lost access to some books)
          // This will also update bookRoles and validate selectedBookId
          await fetchBooks();
          
          // After fetching books, check if the currently selected book is still accessible
          // Use the ref to get the most current value after fetchBooks might have updated it
          const latestSelectedBookId = selectedBookIdRef.current;
          if (latestSelectedBookId) {
            const { data: memberCheck } = await supabase
              .from('book_members')
              .select('book_id')
              .eq('book_id', latestSelectedBookId)
              .eq('user_email', user.email)
              .single();
            
            // If user no longer has access to the selected book, fetchBooks should have handled it
            // But double-check and clear transactions if needed
            if (!memberCheck) {
              console.log('Selected book no longer accessible after refresh, clearing transactions');
              setTransactions([]);
              
              // Get the book name for the toast
              let removedBookName = 'this book';
              try {
                const { data: bookData } = await supabase
                  .from('books')
                  .select('name')
                  .eq('id', latestSelectedBookId)
                  .single();
                
                if (bookData) {
                  removedBookName = bookData.name;
                }
              } catch (error) {
                console.error('Error fetching book name:', error);
              }
              
              // Show toast and trigger hard refresh since user lost access to current book
              toast.error(`Your access to "${removedBookName}" has been removed. Refreshing page...`);
              
              // Force a hard refresh after a short delay to show the toast
              setTimeout(() => {
                window.location.reload();
              }, 2000);
              return; // Don't continue with the refresh logic, we're doing a hard refresh
            }
          }
          
          // Get fresh books list after fetchBooks completes
          // We need to fetch books again to get the updated list
          const { data: updatedBooks } = await supabase
            .from('book_members')
            .select('book_id')
            .eq('user_email', user.email);
          
          if (updatedBooks && updatedBooks.length > 0) {
            const bookIds = updatedBooks.map(m => m.book_id);
            const { data: booksData } = await supabase
              .from('books')
              .select('*')
              .in('id', bookIds)
              .order('created_at', { ascending: true });
            
            if (booksData) {
              // Refresh book roles for all accessible books
              const rolesMap: Record<number, string> = {};
              await Promise.all(
                booksData.map(async (book) => {
                  const { data: memberData } = await supabase
                    .from('book_members')
                    .select('role')
                    .eq('book_id', book.id)
                    .eq('user_email', user.email)
                    .single();
                  
                  if (memberData) {
                    rolesMap[book.id] = memberData.role;
                  }
                })
              );
              setBookRoles(rolesMap);
            }
          }
          
          // Refresh book members if a book is selected
          if (selectedBookId) {
            try {
              const { data, error } = await supabase
                .from('book_members')
                .select('user_email, role')
                .eq('book_id', selectedBookId)
                .order('created_at', { ascending: true });
              
              if (!error && data) {
                const membersWithNames = await Promise.all(
                  data.map(async (member: any) => {
                    const { data: nameData, error: nameError } = await supabase
                      .rpc('get_user_name', { p_user_email: member.user_email });
                    
                    const name = nameError ? member.user_email.split('@')[0] : (nameData || member.user_email.split('@')[0]);
                    
                    return {
                      email: member.user_email,
                      role: member.role,
                      name: name,
                    };
                  })
                );
                setBookMembers(membersWithNames);
                
                // Update bookRoles for the current book
                const currentUserMember = membersWithNames.find(m => m.email === user.email);
                if (currentUserMember && selectedBookId) {
                  setBookRoles(prev => ({
                    ...prev,
                    [selectedBookId]: currentUserMember.role
                  }));
                }
              }
            } catch (error) {
              console.error('Error refreshing book members:', error);
            }
          }
          
          // Refresh transactions (permissions might have changed)
          if (selectedBookId) {
            await fetchTransactions();
          }
          
          // Refresh parties (permissions might have changed)
          if (selectedBookId) {
            try {
              const { data, error } = await supabase
                .from('parties')
                .select('name')
                .eq('book_id', selectedBookId)
                .order('name', { ascending: true });
              
              if (error) {
                console.error('Error fetching parties:', error);
                setParties([]);
              } else if (data) {
                setParties(data.map(p => p.name));
              }
            } catch (error) {
              console.error('Error fetching parties:', error);
              setParties([]);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to book_members changes for user:', user.email);
        } else if (status === 'CHANNEL_ERROR') {
          // Only log error if there are books - when no books exist, this is expected
          if (booksLengthRef.current > 0) {
            console.error('Error subscribing to book_members changes:', err);
          }
          // Don't show error to user - realtime is optional, app will work with polling
        } else if (status === 'TIMED_OUT') {
          // Only log warning if there are books
          if (booksLengthRef.current > 0) {
            console.warn('Book members subscription timed out for user:', user.email);
          }
        } else if (status === 'CLOSED') {
          console.log('Book members subscription closed for user:', user.email);
        }
      });

    // Cleanup subscription when user changes or component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, fetchBooks]);

  // Store fetch functions in refs to avoid dependency issues
  const fetchTransactionsRef = useRef(fetchTransactions);
  const fetchBooksRef = useRef(fetchBooks);
  const booksLengthRef = useRef(books.length);
  const booksLoadingRef = useRef(booksLoading);
  
  // Update refs when functions change
  useEffect(() => {
    fetchTransactionsRef.current = fetchTransactions;
    fetchBooksRef.current = fetchBooks;
    booksLengthRef.current = books.length;
    booksLoadingRef.current = booksLoading;
  }, [fetchTransactions, fetchBooks, books.length, booksLoading]);

  // Browser history management for back button navigation
  useEffect(() => {
    // Handle browser back button
    const handlePopState = (e: PopStateEvent) => {
      // Close modals in reverse order of opening (most recent first)
      if (isHistoryDialogOpen) {
        setIsHistoryDialogOpen(false);
        return;
      }
      if (isDeleteMemberConfirmOpen) {
        setIsDeleteMemberConfirmOpen(false);
        return;
      }
      if (isDeleteBookConfirmOpen) {
        setIsDeleteBookConfirmOpen(false);
        return;
      }
      if (isDeleteConfirmOpen) {
        setIsDeleteConfirmOpen(false);
        return;
      }
      if (isEditDialogOpen) {
        setIsEditDialogOpen(false);
        return;
      }
      if (isDialogOpen) {
        setIsDialogOpen(false);
        return;
      }
      if (isEditRoleModalOpen) {
        setIsEditRoleModalOpen(false);
        return;
      }
      if (isAddMemberModalOpen) {
        setIsAddMemberModalOpen(false);
        return;
      }
      if (isPartySelectorOpen) {
        setIsPartySelectorOpen(false);
        return;
      }
      if (isDateFilterOpen) {
        setIsDateFilterOpen(false);
        return;
      }
      if (isBookDialogOpen) {
        setIsBookDialogOpen(false);
        return;
      }
      if (isRenameBookDialogOpen) {
        setIsRenameBookDialogOpen(false);
        return;
      }
      if (isActivityModalOpen) {
        setIsActivityModalOpen(false);
        return;
      }
      if (isMembersModalOpen) {
        setIsMembersModalOpen(false);
        return;
      }
      if (isProfileOpen) {
        setIsProfileOpen(false);
        return;
      }
      if (isPasswordChangeModalOpen) {
        setIsPasswordChangeModalOpen(false);
        return;
      }
      if (isLogoutConfirmOpen) {
        setIsLogoutConfirmOpen(false);
        return;
      }
      if (isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
        return;
      }
      if (activeTab === 'reports') {
        setActiveTab('home');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    isHistoryDialogOpen, isDeleteMemberConfirmOpen, isDeleteBookConfirmOpen, isDeleteConfirmOpen,
    isEditDialogOpen, isDialogOpen, isEditRoleModalOpen, isAddMemberModalOpen, isPartySelectorOpen,
    isDateFilterOpen, isBookDialogOpen, isRenameBookDialogOpen, isActivityModalOpen,
    isMembersModalOpen, isProfileOpen, isPasswordChangeModalOpen, isLogoutConfirmOpen, isSettingsModalOpen, activeTab
  ]);

  // Push to history when modals open or tab changes
  useEffect(() => {
    const hasOpenModal = isHistoryDialogOpen || isDeleteMemberConfirmOpen || isDeleteBookConfirmOpen ||
      isDeleteConfirmOpen || isEditDialogOpen || isDialogOpen || isEditRoleModalOpen ||
      isAddMemberModalOpen || isPartySelectorOpen || isDateFilterOpen || isBookDialogOpen ||
      isRenameBookDialogOpen || isActivityModalOpen || isMembersModalOpen || isProfileOpen ||
      isPasswordChangeModalOpen || isLogoutConfirmOpen || isSettingsModalOpen || activeTab === 'reports';

    if (hasOpenModal) {
      const state = { 
        timestamp: Date.now(),
        tab: activeTab
      };
      window.history.pushState(state, '', window.location.href);
    }
  }, [
    isHistoryDialogOpen, isDeleteMemberConfirmOpen, isDeleteBookConfirmOpen, isDeleteConfirmOpen,
    isEditDialogOpen, isDialogOpen, isEditRoleModalOpen, isAddMemberModalOpen, isPartySelectorOpen,
    isDateFilterOpen, isBookDialogOpen, isRenameBookDialogOpen, isActivityModalOpen,
    isMembersModalOpen, isProfileOpen, isPasswordChangeModalOpen, isLogoutConfirmOpen, isSettingsModalOpen, activeTab
  ]);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const hasOpenModal = isDialogOpen || isEditDialogOpen || isMembersModalOpen || 
                        isActivityModalOpen || isProfileOpen || isSettingsModalOpen ||
                        isAddMemberModalOpen || isEditRoleModalOpen || isHistoryDialogOpen ||
                        isBookDialogOpen || isDeleteConfirmOpen || isRenameBookDialogOpen ||
                        isDeleteBookConfirmOpen || isBookSelectorOpen || isDateFilterOpen ||
                        isAddPartyDialogOpen || isRenamePartyDialogOpen || isDeletePartyConfirmOpen ||
                        isPartySelectorOpen || isDeleteMemberConfirmOpen || isPasswordChangeModalOpen ||
                        isLogoutConfirmOpen;
    
    if (hasOpenModal) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [
    isDialogOpen, isEditDialogOpen, isMembersModalOpen, isActivityModalOpen, isProfileOpen,
    isSettingsModalOpen, isAddMemberModalOpen, isEditRoleModalOpen, isHistoryDialogOpen,
    isBookDialogOpen, isDeleteConfirmOpen, isRenameBookDialogOpen, isDeleteBookConfirmOpen,
    isBookSelectorOpen, isDateFilterOpen, isAddPartyDialogOpen, isRenamePartyDialogOpen,
    isDeletePartyConfirmOpen, isPartySelectorOpen, isDeleteMemberConfirmOpen, isPasswordChangeModalOpen,
    isLogoutConfirmOpen
  ]);

  // Fetch book members when book changes (needed for member filter)
  useEffect(() => {
    if (!selectedBookId || !user?.email) {
      setBookMembers([]);
      return;
    }
    
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const { data, error } = await supabase
          .from('book_members')
          .select('user_email, role')
          .eq('book_id', selectedBookId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching book members:', error);
          setBookMembers([]);
        } else if (data) {
          // Fetch user names for each member using database function
          const membersWithNames = await Promise.all(
            data.map(async (member: any) => {
              // Use database function to get user name from auth.users metadata
              const { data: nameData, error: nameError } = await supabase
                .rpc('get_user_name', { p_user_email: member.user_email });
              
              const name = nameError ? member.user_email.split('@')[0] : (nameData || member.user_email.split('@')[0]);
              
              return {
                email: member.user_email,
                role: member.role,
                name: name,
              };
            })
          );
          setBookMembers(membersWithNames);
          
          // Update bookRoles for the current book
          const currentUserMember = membersWithNames.find(m => m.email === user?.email);
          if (currentUserMember && selectedBookId) {
            setBookRoles(prev => ({
              ...prev,
              [selectedBookId]: currentUserMember.role
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching book members:', error);
        setBookMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };
    
    fetchMembers();
  }, [selectedBookId, user?.email]);

  // Update formData.addedBy when profileData changes
  useEffect(() => {
    const currentUserName = getCurrentUserName();
    if (currentUserName && currentUserName !== formData.addedBy) {
      setFormData(prev => ({
        ...prev,
        addedBy: currentUserName,
      }));
    }
  }, [profileData.name, user?.email]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 18) return "Good afternoon,";
    return "Good evening,";
  };

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Helper function to format field values for display
  const formatHistoryValue = (key: string, value: any): string => {
    if (key === 'type') {
      return capitalizeFirst(String(value));
    }
    if (key === 'party' && (value === null || value === undefined || value === '')) {
      return 'None';
    }
    return String(value);
  };

  // Helper function to get IST date (UTC+5:30)
  const getISTDate = (date?: Date | string | number): Date => {
    const d = date ? new Date(date) : new Date();
    // IST is UTC+5:30, so we add 5 hours and 30 minutes
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
    return new Date(utcTime + istOffset);
  };

  // Format date in IST timezone
  const formatDate = (dateString: string) => {
    const date = getISTDate(dateString);
    // Always return formatted date, never "Today" or "Yesterday"
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      timeZone: "Asia/Kolkata"
    });
  };

  // Get IST timestamp for a date (start of day in IST)
  const getISTTimestamp = (dateString: string, useCurrentTime: boolean = false): number => {
    if (useCurrentTime) {
      // Return current IST time as timestamp
      return getISTDate().getTime();
    }
    
    // Parse the date string (YYYY-MM-DD) and create date at start of day in IST
    // Create date in IST timezone (UTC+5:30)
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date object assuming it's in IST, then convert to UTC timestamp
    // IST is UTC+5:30, so to get UTC timestamp for IST midnight, we subtract 5:30
    const istMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    return istMidnight.getTime() - istOffset; // Subtract offset to get UTC timestamp
  };

  // Get transaction type icon and color
  const getTransactionTypeIcon = (type: "income" | "expense") => {
    if (type === "income") {
      return { icon: ArrowUp, arrowColor: "text-green-600", bgColor: "bg-gray-100" };
    } else {
      return { icon: ArrowDown, arrowColor: "text-red-600", bgColor: "bg-gray-100" };
    }
  };

  // Format numbers in Indian number system (lakhs, crores)
  const formatIndianNumber = (num: number): string => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(num);
  };

  // Parse Indian formatted number string back to number
  const parseIndianNumber = (value: string): string => {
    // Remove all commas and spaces
    return value.replace(/,/g, '').trim();
  };

  // Format amount for display in input field
  const formatAmountForInput = (value: string): string => {
    if (!value) return '';
    // Remove all non-digit characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    // Allow only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  // Format amount with Indian number system for display
  const formatAmountDisplay = (value: string, isEditing: boolean = false): string => {
    if (!value) return '';
    // If user is actively typing, show raw value (no formatting to avoid interference)
    if (isEditing) {
      return value;
    }
    // Full formatting when not editing (on blur)
    const numValue = parseFloat(parseIndianNumber(value));
    if (isNaN(numValue)) return value;
    return formatIndianNumber(numValue);
  };

  // Note: Balance calculations moved below after filteredTransactions is defined

  // Calculate running balance for each transaction
  // Sort chronologically (oldest first) to calculate running balance
  const chronologicalTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  const balanceMap = new Map<number, number>();
  let runningBalance = 0;
  
  chronologicalTransactions.forEach((transaction) => {
    runningBalance += transaction.type === "income" ? transaction.amount : -transaction.amount;
    balanceMap.set(transaction.id, runningBalance);
  });

  const fetchTransactionHistory = async (transactionId: number) => {
    try {
      const { data, error } = await supabase
        .from('transaction_history')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching transaction history:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Transaction ID:', transactionId);
        // If table doesn't exist or RLS issue, return empty array gracefully
        setTransactionHistory([]);
        return;
      }
      
      setTransactionHistory(data || []);
    } catch (error: any) {
      console.error('Exception fetching transaction history:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setTransactionHistory([]);
    }
  };

  const handleShowHistory = async () => {
    if (editingTransaction) {
      await fetchTransactionHistory(editingTransaction.id);
      setIsHistoryDialogOpen(true);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    // Category removed - no longer needed
    
    // Parse the date string to get the correct date
    // The date field is stored as "Jan 14, 2026" format
    let dateValue = new Date().toISOString().split("T")[0]; // fallback
    
    try {
      // Try to parse the date string from transaction.date
      const dateMatch = transaction.date.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        const monthMap: { [key: string]: string } = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const monthNum = monthMap[month] || '01';
        const dayPadded = day.padStart(2, '0');
        dateValue = `${year}-${monthNum}-${dayPadded}`;
      } else {
        // Fallback: use timestamp but convert to IST date
        const date = getISTDate(transaction.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateValue = `${year}-${month}-${day}`;
      }
    } catch (error) {
      // Fallback: use timestamp but convert to IST date
      const date = getISTDate(transaction.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dateValue = `${year}-${month}-${day}`;
    }
    
    // Store original values for comparison
    setOriginalTransactionValues({
      name: transaction.name,
      amount: transaction.amount,
      type: transaction.type,
      addedBy: transaction.addedBy,
      date: dateValue,
    });

    // Auto-populate addedBy from current user's name when editing
    const currentUserAddedBy = getCurrentUserName();
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.name,
      addedBy: currentUserAddedBy,
      party: (transaction as any).party || "",
      date: dateValue,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTransaction = async () => {
    if (!formData.amount || !formData.description || !editingTransaction) {
      toast.error("Please fill in all fields");
      return;
    }

    // Auto-populate addedBy from current user's name (keep original for history, but update to current user)
    const currentUserAddedBy = getCurrentUserName();

    // Validate amount
    let amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    // Check if amount exceeds user input limit (10,000,000,000)
    const MAX_AMOUNT = 10000000000;
    if (amount > MAX_AMOUNT) {
      toast.error(`Maximum amount limit is ₹${formatIndianNumber(MAX_AMOUNT)}`);
      // Block submission - don't allow values above limit
      return;
    }

    // Validate description length (max 1000 characters)
    const MAX_DESCRIPTION_LENGTH = 1000;
    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Description is too long. Maximum ${MAX_DESCRIPTION_LENGTH} characters allowed`);
      return;
    }

    // Calculate timestamp in IST - if date is today, use current time, otherwise use start of that day
    const selectedDateStr = formData.date;
    const todayIST = getISTDate();
    const todayISTStr = todayIST.toISOString().split('T')[0];
    
    let timestamp: number;
    if (selectedDateStr === todayISTStr) {
      // If today, use current IST time to ensure it appears at the top
      timestamp = getISTTimestamp(selectedDateStr, true);
    } else {
      // For past dates, use start of that day in IST
      timestamp = getISTTimestamp(selectedDateStr, false);
    }

    // Prepare old and new values for history
    const oldValues = {
      name: editingTransaction.name,
      amount: editingTransaction.amount,
      type: editingTransaction.type,
      added_by: editingTransaction.addedBy,
      party: (editingTransaction as any).party || null,
      date: editingTransaction.date,
    };

    const newValues = {
      name: formData.description,
      amount: parseFloat(formData.amount),
      type: transactionType,
      added_by: currentUserAddedBy,
      party: formData.party || null,
      date: formatDate(formData.date),
    };

    // Update transaction in Supabase
    const updatePayload: any = {
      name: formData.description,
      date: formatDate(formData.date),
      amount: parseFloat(formData.amount),
      type: transactionType,
      added_by: currentUserAddedBy,
      party: formData.party || null,
      timestamp: timestamp,
    };

    const { error, data } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', editingTransaction.id)
      .select();

    if (error) {
      // Log detailed error information
      console.error('Error updating transaction:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      console.error('Update payload:', JSON.stringify(updatePayload, null, 2));
      
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'edit transactions');
      if (isPermissionErr) {
        return;
      }
      
      // Show user-friendly error message
      let errorMessage = 'Failed to update transaction. ';
      if (error.code === '22003') {
        errorMessage += 'Maximum amount limit is ₹10,00,00,00,000';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      toast.error(errorMessage);
      return;
    }

    // Check if there are actual changes (old values != new values)
    const oldValuesStr = JSON.stringify(oldValues);
    const newValuesStr = JSON.stringify(newValues);
    const hasActualChanges = oldValuesStr !== newValuesStr;

    if (hasActualChanges) {
      // Clean up any duplicate history entries before adding new one
      // Delete any existing 'updated' entries with same old/new values to avoid duplicates
      const { data: existingHistory } = await supabase
        .from('transaction_history')
        .select('id, old_values, new_values')
        .eq('transaction_id', editingTransaction.id)
        .eq('change_type', 'updated');
      
      if (existingHistory) {
        // Find and delete exact duplicates
        const duplicateIds = existingHistory
          .filter(h => 
            JSON.stringify(h.old_values) === oldValuesStr && 
            JSON.stringify(h.new_values) === newValuesStr
          )
          .map(h => h.id);
        
        if (duplicateIds.length > 0) {
          await supabase
            .from('transaction_history')
            .delete()
            .in('id', duplicateIds);
        }
      }

      // Log change to history only if there are actual changes
      await supabase
        .from('transaction_history')
        .insert({
          transaction_id: editingTransaction.id,
          changed_by: currentUserAddedBy,
          change_type: 'updated',
          old_values: oldValues,
          new_values: newValues,
        });
    } else {
      // If no actual changes, clean up any existing history entries with identical old/new values
      const { data: existingHistory } = await supabase
        .from('transaction_history')
        .select('id, old_values, new_values')
        .eq('transaction_id', editingTransaction.id)
        .eq('change_type', 'updated');
      
      if (existingHistory) {
        // Find and delete entries where old_values === new_values (no actual change)
        const noChangeIds = existingHistory
          .filter(h => {
            const hOldStr = JSON.stringify(h.old_values);
            const hNewStr = JSON.stringify(h.new_values);
            return hOldStr === hNewStr;
          })
          .map(h => h.id);
        
        if (noChangeIds.length > 0) {
          await supabase
            .from('transaction_history')
            .delete()
            .in('id', noChangeIds);
        }
      }
    }

    // Refresh transactions from Supabase
    await fetchTransactions();
    
    // Reset form
    setFormData({
      amount: "",
      description: "",
      addedBy: currentUserAddedBy, // Keep current user's name
      party: "",
      date: getISTDate().toISOString().split("T")[0],
    });
    setTransactionType("expense");
    setEditingTransaction(null);
    setOriginalTransactionValues(null);
    setIsEditDialogOpen(false);
    
    // Show success toast
    toast.success('Transaction updated successfully');
    
    // Log activity
    await logActivity('transaction_updated', `Updated transaction: ${formData.description}`, {
      transaction_id: editingTransaction.id,
      old_values: oldValues,
      new_values: newValues
    });
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', editingTransaction.id);

    if (error) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'delete transactions');
      if (isPermissionErr) {
        return;
      }
      
      console.error('Error deleting transaction:', error);
      toast.error(`Failed to delete transaction: ${error.message || JSON.stringify(error)}`);
      return;
    }

    // Refresh transactions from Supabase
    await fetchTransactions();
    
    // Auto-populate addedBy from current user's name
    const currentUserAddedBy = getCurrentUserName();
    
    // Reset form and close dialogs
    setFormData({
      amount: "",
      description: "",
      addedBy: currentUserAddedBy, // Keep current user's name
      party: "",
      date: getISTDate().toISOString().split("T")[0],
    });
    setTransactionType("expense");
    setEditingTransaction(null);
    setIsEditDialogOpen(false);
    setIsDeleteConfirmOpen(false);
    
    // Log activity (capture before state is cleared)
    const deletedTransactionName = editingTransaction.name;
    const deletedTransactionAmount = editingTransaction.amount;
    const deletedTransactionType = editingTransaction.type;
    const deletedTransactionId = editingTransaction.id;
    
    // Show success toast
    toast.success('Transaction deleted successfully');
    
    // Log activity
    await logActivity('transaction_deleted', `Deleted transaction: ${deletedTransactionName}`, {
      transaction_id: deletedTransactionId,
      amount: deletedTransactionAmount,
      type: deletedTransactionType
    });
  };

  const handleAddTransaction = async () => {
    if (!formData.amount || !formData.description) {
      toast.error("Please fill in all fields");
      return;
    }

    // Auto-populate addedBy from current user's name
    const currentUserAddedBy = getCurrentUserName();

    // Validate amount
    let amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    // Check if amount exceeds user input limit (10,000,000,000)
    const MAX_AMOUNT = 10000000000;
    if (amount > MAX_AMOUNT) {
      toast.error(`Maximum amount limit is ₹${formatIndianNumber(MAX_AMOUNT)}`);
      // Block submission - don't allow values above limit
      return;
    }

    // Validate description length (max 1000 characters)
    const MAX_DESCRIPTION_LENGTH = 1000;
    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Description is too long. Maximum ${MAX_DESCRIPTION_LENGTH} characters allowed`);
      return;
    }

    // Calculate timestamp in IST - if date is today, use current time, otherwise use start of that day
    const selectedDateStr = formData.date;
    const todayIST = getISTDate();
    const todayISTStr = todayIST.toISOString().split('T')[0];
    
    let timestamp: number;
    if (selectedDateStr === todayISTStr) {
      // If today, use current IST time to ensure it appears at the top
      timestamp = getISTTimestamp(selectedDateStr, true);
    } else {
      // For past dates, use start of that day in IST
      timestamp = getISTTimestamp(selectedDateStr, false);
    }

    if (!selectedBookId) {
      toast.error("Please select a book first");
      return;
    }

    // Insert transaction into Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        name: formData.description,
        date: formatDate(formData.date),
        amount: amount,
        type: transactionType,
        added_by: currentUserAddedBy,
        party: formData.party || null,
        timestamp: timestamp,
        book_id: selectedBookId,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'add transactions');
      if (isPermissionErr) {
        return;
      }
      
      // Log detailed error information
      console.error('Error adding transaction:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      
      // Show user-friendly error message
      let errorMessage = 'Failed to add transaction. ';
      if (error.code === '22003') {
        errorMessage += 'Maximum amount limit is ₹10,00,00,00,000';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      toast.error(errorMessage);
      return;
    }

    // Log creation to history
    if (data) {
      await supabase
        .from('transaction_history')
        .insert({
          transaction_id: data.id,
          changed_by: currentUserAddedBy,
          change_type: 'created',
          old_values: null,
          new_values: {
            name: formData.description,
            amount: parseFloat(formData.amount),
            type: transactionType,
            added_by: currentUserAddedBy,
            party: formData.party || null,
            date: formatDate(formData.date),
          },
        });
    }

    // Refresh transactions from Supabase
    await fetchTransactions();
    
    // Reset form
    setFormData({
      amount: "",
      description: "",
      addedBy: currentUserAddedBy, // Keep current user's name
      party: "",
      date: getISTDate().toISOString().split("T")[0],
    });
    setTransactionType("expense");
    setIsDialogOpen(false);
    
    // Show success toast
    toast.success('Transaction added successfully');
    
    // Log activity
    await logActivity('transaction_created', `Added ${transactionType} transaction: ${formData.description}`, {
      transaction_id: data?.id,
      amount: amount,
      type: transactionType
    });
  };

  // Create a new book - any authenticated user can create books
  // Permissions only apply to specific books after creation
  const handleCreateBook = async () => {
    if (!newBookName.trim()) {
      toast.error("Please enter a book name");
      return;
    }

    setIsCreatingBook(true);

    // Validate book name length (max 30 characters)
    const MAX_BOOK_NAME_LENGTH = 30;
    if (newBookName.trim().length > MAX_BOOK_NAME_LENGTH) {
      toast.error(`Book name is too long. Maximum ${MAX_BOOK_NAME_LENGTH} characters allowed`);
      return;
    }

    // Check for duplicate book name per user (case-insensitive)
    // Only check among books the current user has access to
    const trimmedName = newBookName.trim();
    const duplicateBook = books.find(
      book => book.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (duplicateBook) {
      toast.error("You already have a book with this name");
      return;
    }

    const { data, error } = await supabase
      .from('books')
      .insert({
        name: trimmedName,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'create books');
      if (isPermissionErr) {
        setIsCreatingBook(false);
        return;
      }
      
      if (error.code === '23505') { // Unique constraint violation
        toast.error("A book with this name already exists");
      } else {
        console.error('Error creating book:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Failed to create book: ${error.message || 'Unknown error'}`);
      }
      setIsCreatingBook(false);
      return;
    }

    // Add creator as owner to book_members
    if (data?.id && user?.email) {
      const { error: memberError } = await supabase
        .from('book_members')
        .insert({
          book_id: data.id,
          user_email: user.email,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding creator as book member:', memberError);
        toast.warning('Book created, but failed to set you as owner. Please contact support.');
      } else {
        // Update bookRoles immediately
        setBookRoles(prev => ({
          ...prev,
          [data.id]: 'owner'
        }));
      }
    }

    // Refresh books list (but don't switch to the new book - stay on current book)
    await fetchBooks();
    
    const createdBookName = trimmedName;
    // Clear the input field
    setNewBookName("");
    // Close the create book modal
    setIsBookDialogOpen(false);
    // Open the book selector modal so user can switch to the new book if they want
    setIsBookSelectorOpen(true);
    toast.success(`Book "${createdBookName}" created successfully`);
    setIsCreatingBook(false);
    
    // Log activity (note: this will be logged in the new book's context)
    if (data?.id) {
      try {
        await supabase.rpc('log_activity', {
          p_book_id: data.id,
          p_user_email: user?.email,
          p_user_name: getCurrentUserName(),
          p_activity_type: 'book_created',
          p_description: `Created book: ${createdBookName}`,
          p_metadata: { book_name: createdBookName }
        });
      } catch (error) {
        console.error('Error logging book creation activity:', error);
      }
    }
  };

  const handleRenameBook = async () => {
    if (!editingBook || !newBookName.trim()) {
      toast.error("Please enter a book name");
      return;
    }

    // Check if user has permission to manage books (only owner can rename)
    const userRole = await getUserRoleForBook(editingBook.id);
    if (userRole !== 'owner') {
      toast.error("Only book owners can rename books");
      setIsRenameBookDialogOpen(false);
      setEditingBook(null);
      setNewBookName("");
      setOriginalBookName("");
      return;
    }

    // Validate book name length (max 30 characters)
    const MAX_BOOK_NAME_LENGTH = 30;
    if (newBookName.trim().length > MAX_BOOK_NAME_LENGTH) {
      toast.error(`Book name is too long. Maximum ${MAX_BOOK_NAME_LENGTH} characters allowed`);
      return;
    }

    // Check for duplicate book name (case-insensitive, excluding current book)
    const trimmedName = newBookName.trim();
    // Check for duplicate book name per user (excluding current book)
    const duplicateBook = books.find(
      book => book.id !== editingBook.id && book.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (duplicateBook) {
      toast.error("You already have a book with this name");
      return;
    }

    const { error } = await supabase
      .from('books')
      .update({ name: trimmedName })
      .eq('id', editingBook.id);

    if (error) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'rename books');
      if (isPermissionErr) {
        return;
      }
      
      if (error.code === '23505') { // Unique constraint violation
        toast.error("A book with this name already exists");
      } else {
        console.error('Error renaming book:', error);
        toast.error('Failed to rename book. Please try again.');
      }
      return;
    }

    // Refresh books
    await fetchBooks();
    const renamedBookOldName = originalBookName;
    const renamedBookNewName = trimmedName;
    setNewBookName("");
    setEditingBook(null);
    setIsRenameBookDialogOpen(false);
    toast.success('Book renamed successfully');
    
    // Log activity
    await logActivity('book_renamed', `Renamed book from "${renamedBookOldName}" to "${renamedBookNewName}"`, {
      old_name: renamedBookOldName,
      new_name: renamedBookNewName
    });
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      setIsLogoutConfirmOpen(false);
      window.location.href = "/auth";
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout. Please try again.');
      setLogoutLoading(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;

    setIsDeletingBook(true);

    // Check if user has permission to manage books (only owner can delete)
    const userRole = await getUserRoleForBook(bookToDelete);
    if (userRole !== 'owner') {
      toast.error("Only book owners can delete books");
      setIsDeleteBookConfirmOpen(false);
      setBookToDelete(null);
      setBookToDeleteName("");
      setDeleteBookConfirmationText("");
      setIsDeletingBook(false);
      return;
    }

    // Verify the confirmation text matches the book name
    if (deleteBookConfirmationText.trim() !== bookToDeleteName.trim()) {
      toast.error('Book name does not match. Please type the exact book name to confirm deletion.');
      setIsDeletingBook(false);
      return;
    }

    // First, fetch all transaction IDs for this book
    const { data: bookTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id')
      .eq('book_id', bookToDelete);

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError);
      toast.error('Failed to fetch transactions. Please try again.');
      return;
    }

    // Delete all associated data for this book
    
    // 1. Delete transaction history (if transactions exist)
    if (bookTransactions && bookTransactions.length > 0) {
      const transactionIds = bookTransactions.map(t => t.id);
      
      // Delete transaction history
      const { error: historyError } = await supabase
        .from('transaction_history')
        .delete()
        .in('transaction_id', transactionIds);

      if (historyError) {
        console.error('Error deleting transaction history:', historyError);
        toast.error('Failed to delete transaction history. Please try again.');
        setIsDeletingBook(false);
        return;
      }

      // Delete all transactions for this book
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('book_id', bookToDelete);

      if (transactionsError) {
        console.error('Error deleting transactions:', transactionsError);
        toast.error('Failed to delete transactions. Please try again.');
        setIsDeletingBook(false);
        return;
      }
    }

    // 2. Delete all parties for this book
    const { error: partiesError } = await supabase
      .from('parties')
      .delete()
      .eq('book_id', bookToDelete);

    if (partiesError) {
      console.error('Error deleting parties:', partiesError);
      toast.error('Failed to delete parties. Please try again.');
      setIsDeletingBook(false);
      return;
    }

    // 3. Delete all activity log entries for this book
    const { error: activityError } = await supabase
      .from('activity_log')
      .delete()
      .eq('book_id', bookToDelete);

    if (activityError) {
      console.error('Error deleting activity log:', activityError);
      toast.error('Failed to delete activity log. Please try again.');
      setIsDeletingBook(false);
      return;
    }

    // 4. Delete all book members for this book
    const { error: membersError } = await supabase
      .from('book_members')
      .delete()
      .eq('book_id', bookToDelete);

    if (membersError) {
      console.error('Error deleting book members:', membersError);
      toast.error('Failed to delete book members. Please try again.');
      setIsDeletingBook(false);
      return;
    }

    // Log activity BEFORE deleting the book (so we can still reference it)
    // IMPORTANT: Pass bookToDelete explicitly to log in the correct book's activity log
    // This ensures the activity is logged in the book being deleted, not the currently selected book
    const deletedBookName = bookToDeleteName;
    try {
      await logActivity('book_deleted', `Deleted book: ${deletedBookName}`, {
        book_id: bookToDelete,
        book_name: deletedBookName
      }, bookToDelete); // Pass bookToDelete explicitly to log in the correct book
    } catch (activityError) {
      // Don't block book deletion if activity logging fails
      console.error('Error logging book deletion activity:', activityError);
    }

    // Now delete the book
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookToDelete);

    if (error) {
      // Check if it's a permission error first
      const isPermissionErr = await handlePermissionError(error, 'delete books');
      if (isPermissionErr) {
        return;
      }
      
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book. Please try again.');
      setIsDeletingBook(false);
      return;
    }

    // If deleted book was selected, switch to first available book (if any)
    if (selectedBookId === bookToDelete) {
      const remainingBooks = books.filter(b => b.id !== bookToDelete);
      if (remainingBooks.length > 0) {
        setSelectedBookId(remainingBooks[0].id);
      } else {
        // No books left, clear selection
        setSelectedBookId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedBookId');
        }
      }
    }
    
    // Refresh books and transactions
    await fetchBooks();
    // Only fetch transactions if there's still a selected book
    if (selectedBookId !== bookToDelete || books.filter(b => b.id !== bookToDelete).length > 0) {
      await fetchTransactions();
    } else {
      setTransactions([]);
    }
    setIsDeleteBookConfirmOpen(false);
    setBookToDelete(null);
    setBookToDeleteName("");
    setDeleteBookConfirmationText("");
    setIsDeletingBook(false);
    toast.success('Book and all its transactions deleted successfully');
  };

  const handleOpenRenameBook = (book: Book) => {
    setEditingBook(book);
    setNewBookName(book.name);
    setOriginalBookName(book.name);
    setOpenBookMenuId(null);
    setIsRenameBookDialogOpen(true);
  };

  const handleOpenDeleteBook = (bookId: number) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setBookToDelete(bookId);
      setBookToDeleteName(book.name);
      setDeleteBookConfirmationText("");
      setOpenBookMenuId(null);
      setIsDeleteBookConfirmOpen(true);
    }
  };

  const handleBookSwitch = async (bookId: number) => {
    // Validate that the user still has access to this book before switching
    if (!user?.email) {
      toast.error('Please log in to switch books');
      return;
    }

    const { data: memberCheck } = await supabase
      .from('book_members')
      .select('book_id')
      .eq('book_id', bookId)
      .eq('user_email', user.email)
      .single();

    if (!memberCheck) {
      toast.error('You no longer have access to this book. Refreshing...');
      // Refresh books to get updated list
      await fetchBooks();
      setIsBookSelectorOpen(false);
      return;
    }

    setSelectedBookId(bookId);
    setIsBookSelectorOpen(false);
  };

  const handleOpenBookSelector = () => {
    setIsBookSelectorOpen(true);
  };

  // Refresh books when book selector opens to ensure we have the latest list
  useEffect(() => {
    if (isBookSelectorOpen && user?.email) {
      fetchBooks();
    }
  }, [isBookSelectorOpen, user?.email, fetchBooks]);

  // Helper function to parse date string (e.g., "Jan 14, 2026")
  const parseDateString = (dateStr: string): Date => {
    return new Date(dateStr);
  };

  // Filter transactions by all filters
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const matchesSearch = 
        transaction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.addedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.amount.toString().includes(searchQuery) ||
        transaction.date.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Type filter (income/expense)
    if (typeFilter !== "all") {
      if (transaction.type !== typeFilter) return false;
    }

    // Member filter
    if (memberFilter !== "all") {
      if (transaction.addedBy !== memberFilter) return false;
    }

    // Party filter
    if (partyFilter !== "all") {
      const transactionParty = (transaction as any).party || "";
      if (transactionParty !== partyFilter) return false;
    }

    // Date filter
    const transactionDate = parseDateString(transaction.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    switch (dateFilter) {
      case "today":
        return transactionDate.toDateString() === today.toDateString();
      case "yesterday":
        return transactionDate.toDateString() === yesterday.toDateString();
      case "thisMonth":
        return transactionDate >= startOfMonth;
      case "lastMonth":
        return transactionDate >= startOfLastMonth && transactionDate <= endOfLastMonth;
      case "singleDay":
        if (!singleDate) return true;
        const selectedDate = new Date(singleDate);
        return transactionDate.toDateString() === selectedDate.toDateString();
      case "dateRange":
        if (!dateRangeStart || !dateRangeEnd) return true;
        const startDate = new Date(dateRangeStart);
        const endDate = new Date(dateRangeEnd);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return transactionDate >= startDate && transactionDate <= endDate;
      case "allTime":
      default:
        return true;
    }
  });
  
  // Calculate totals from filtered transactions
  const totalBalance = filteredTransactions.reduce((sum, t) => {
    return sum + (t.type === "income" ? t.amount : -t.amount);
  }, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const sortedTransactions = [...filteredTransactions].sort((a, b) => b.timestamp - a.timestamp);

  // Group transactions by date
  const groupedTransactions = sortedTransactions.reduce((groups, transaction) => {
    const dateKey = transaction.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {} as Record<string, typeof sortedTransactions>);

  const selectedBook = books.find(b => b.id === selectedBookId);

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Generate a deterministic color gradient from email
  const getGradientFromEmail = (email: string) => {
    if (!email) return "from-primary to-secondary";
    
    // Create a simple hash from email
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Predefined color palette for gradients
    const gradients = [
      { from: "from-purple-500", to: "to-pink-500" },
      { from: "from-blue-500", to: "to-cyan-500" },
      { from: "from-green-500", to: "to-emerald-500" },
      { from: "from-orange-500", to: "to-red-500" },
      { from: "from-indigo-500", to: "to-purple-500" },
      { from: "from-teal-500", to: "to-blue-500" },
      { from: "from-rose-500", to: "to-pink-500" },
      { from: "from-amber-500", to: "to-orange-500" },
      { from: "from-violet-500", to: "to-purple-500" },
      { from: "from-sky-500", to: "to-blue-500" },
      { from: "from-lime-500", to: "to-green-500" },
      { from: "from-fuchsia-500", to: "to-pink-500" },
      { from: "from-cyan-500", to: "to-teal-500" },
      { from: "from-emerald-500", to: "to-green-500" },
      { from: "from-blue-600", to: "to-indigo-600" },
      { from: "from-purple-600", to: "to-pink-600" },
    ];
    
    // Use hash to select a gradient (ensure positive index)
    const index = Math.abs(hash) % gradients.length;
    return `${gradients[index].from} ${gradients[index].to}`;
  };

  // Check if transaction has been modified
  const hasTransactionChanges = originalTransactionValues && editingTransaction ? (
    formData.description !== originalTransactionValues.name ||
    parseFloat(formData.amount) !== originalTransactionValues.amount ||
    transactionType !== originalTransactionValues.type ||
    formData.addedBy !== originalTransactionValues.addedBy ||
    formData.party !== ((editingTransaction as any).party || "") ||
    formData.date !== originalTransactionValues.date
  ) : false;

  // Reset party menu when party selector dialog opens or closes
  useEffect(() => {
    if (!isPartySelectorOpen) {
      setOpenPartyMenu(null);
    }
  }, [isPartySelectorOpen]);

  // Close book menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the menu dropdown
      if (target.closest('[data-book-menu]')) {
        return;
      }
      if (openBookMenuId !== null) {
        setOpenBookMenuId(null);
      }
    };

    if (openBookMenuId !== null) {
      // Use a small delay to allow menu button clicks to register first
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openBookMenuId]);

  // Close party menu when clicking outside (when party selector or party filter dialog is open)
  useEffect(() => {
    // Always reset menu when dialogs close
    if (!isPartySelectorOpen && !isPartyFilterOpen) {
      setOpenPartyMenu(null);
      return;
    }

    // If no menu is open, don't set up listener
    if (openPartyMenu === null) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the menu dropdown
      if (target.closest('[data-party-menu]')) {
        return;
      }
      // Don't close if clicking the three-dot button or the icon itself
      const clickedButton = target.closest('button');
      if (clickedButton && (
          clickedButton.querySelector('.lucide-more-vertical') || 
          clickedButton.classList.contains('hover:bg-black/10') ||
          clickedButton.classList.contains('dark:hover:bg-white/10')
        )) {
        return;
      }
      if (target.closest('.lucide-more-vertical') || target.classList.contains('lucide-more-vertical')) {
        return;
      }
      setOpenPartyMenu(null);
    };

    // Use a longer delay to allow menu button clicks to register first
    let timeoutId: NodeJS.Timeout;
    timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPartyMenu, isPartySelectorOpen, isPartyFilterOpen]);

  // Close member menu when clicking outside (only when members modal is open)
  useEffect(() => {
    if (!isMembersModalOpen) {
      // Close menu if modal is closed
      if (openMemberMenu !== null) {
        setOpenMemberMenu(null);
      }
      return;
    }
    if (openMemberMenu === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is inside the menu dropdown
      const menuElement = target.closest('[data-member-menu]');
      // Check if click is on the three-dot button
      const menuButton = target.closest('[data-member-menu-button]');
      
      // Close menu if click is outside both the menu and the button
      if (!menuElement && !menuButton) {
        setOpenMemberMenu(null);
      }
    };

    let timeoutId: NodeJS.Timeout;
    timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMemberMenu, isMembersModalOpen]);

  // Ensure loading state is cleared if user is not available
  // This must be before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (!user && !authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || logoutLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">{logoutLoading ? "Logging out..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  // Show landing page on first launch or PWA launch
  // Show it regardless of authLoading to ensure it's visible for at least 2 seconds
  if (showLandingPage) {
    return (
      <LandingPage
        onComplete={() => {
          setShowLandingPage(false);
        }}
      />
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-background pb-24 overflow-x-hidden ${sortedTransactions.length === 0 && !loading ? 'h-screen overflow-y-hidden' : 'min-h-screen'}`}>
      {/* Fixed Header with Book Selector and Settings */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border safe-area-top" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <div className="container mx-auto px-4 max-w-2xl w-full">
          <div className="flex items-center justify-between py-2">
            {/* Book Selector - Left side with medium width */}
            <div className="w-48 flex-shrink-0">
              {books.length > 0 && (
                <>
                  {booksLoading ? (
                    <div className="flex items-center gap-2 px-0 py-2">
                      <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                    </div>
                  ) : (
                    <button
                      onClick={handleOpenBookSelector}
                      className="flex items-center gap-1.5 px-0 py-2 hover:opacity-70 transition-opacity"
                    >
                      <span className="font-semibold text-sm truncate">{selectedBook?.name || "Select a book"}</span>
                      <ChevronDown className="h-5 w-5 flex-shrink-0" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Navigation and Settings - Right side */}
            <div className="flex items-center gap-2">
              {/* Activity Button - Only show if books exist */}
              {books.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full transition-colors hover:bg-accent"
                  onClick={() => {
                    setIsActivityModalOpen(true);
                    fetchActivities();
                  }}
                  title="Activity"
                >
                  <Activity className="h-5 w-5" />
                </Button>
              )}

              {/* Members Button - Only show if books exist */}
              {books.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full transition-colors hover:bg-accent"
                  onClick={() => setIsMembersModalOpen(true)}
                  title="Members"
                >
                  <Users className="h-5 w-5" />
                </Button>
              )}

              {/* Settings - Profile avatar */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full bg-gradient-to-r ${getGradientFromEmail(profileData.email)} transition-colors ${
                  isSettingsModalOpen ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={() => {
                  setIsSettingsModalOpen(true);
                }}
                title="Settings"
              >
                <span className="text-sm font-semibold text-white">
                  {getInitials(profileData.name)}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main 
        className={`container mx-auto px-4 pt-2 max-w-2xl w-full overflow-x-hidden ${sortedTransactions.length === 0 && !loading ? 'h-full flex flex-col pb-6' : 'pb-6'}`}
        style={{ 
          paddingTop: 'calc(3.5rem + max(0.5rem, env(safe-area-inset-top)))'
        }}
      >
        {/* Conditional Content Based on Active Tab */}
        {activeTab === "home" && (
          <>
            {/* Show "Create First Book" message if no books exist */}
            {books.length === 0 && !booksLoading ? (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-center px-6 max-w-md">
                  <div className="mb-6">
                    <span className="text-8xl">📚</span>
                  </div>
                  <h2 className="text-lg font-bold mb-3">Create Your First Book</h2>
                  <p className="text-muted-foreground mb-6">
                    Get started by creating a book to organize your transactions and manage expenses.
                  </p>
                  <Button
                    onClick={() => {
                      setIsBookDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold py-6 px-8 rounded-lg text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2 mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    Create Your First Book
                  </Button>
                </div>
              </div>
            ) : books.length > 0 ? (
              <>
        {/* Header with Blue Gradient Background */}
        <header className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl mb-6 safe-area-top w-full shadow-2xl mt-4" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25), 0 0 10px rgba(0, 0, 0, 0.1)" }}>
          <div className="px-5 pt-2 pb-5">
            {/* Balance Card */}
            <div>
              {loading ? (
                <>
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex-1">
                      <div className="mb-1.5">
                        <div className="h-4 w-32 bg-white/20 rounded animate-pulse"></div>
                      </div>
                      <div className="h-12 w-48 bg-white/20 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="w-auto">
                      <div className="h-16 w-16 bg-white/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 ring-1 ring-white/10">
                      <div className="h-4 w-12 bg-white/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-6 w-24 bg-white/20 rounded animate-pulse"></div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 ring-1 ring-white/10">
                      <div className="h-4 w-12 bg-white/20 rounded mb-2 animate-pulse"></div>
                      <div className="h-6 w-24 bg-white/20 rounded animate-pulse"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5">
                        <span className="text-xs font-medium opacity-90 tracking-wide uppercase">Total Balance</span>
                      </div>
                      <div className="text-xl font-bold tracking-tight truncate">₹ {formatIndianNumber(totalBalance)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 pt-3 pb-2 ring-1 ring-white/10 hover:bg-white/15 transition-colors min-w-0">
                      <div className="flex items-center justify-between gap-2.5 mb-0.5">
                        <p className="text-xs opacity-80 font-medium">INCOME</p>
                        <ArrowUp className="h-4 w-4 text-white flex-shrink-0" />
                      </div>
                      <p className="text-sm font-bold text-green-300 truncate">₹ {formatIndianNumber(totalIncome)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 pt-3 pb-2 ring-1 ring-white/10 hover:bg-white/15 transition-colors min-w-0">
                      <div className="flex items-center justify-between gap-2.5 mb-0.5">
                        <p className="text-xs opacity-80 font-medium">EXPENSE</p>
                        <ArrowDown className="h-4 w-4 text-white flex-shrink-0" />
                      </div>
                      <p className="text-sm font-bold text-red-300 truncate">₹ {formatIndianNumber(totalExpenses)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <section className="mb-6">
          <div className="mb-4">
            {loading ? (
              <div className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5">
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                <div className="h-8 flex-1 bg-muted animate-pulse rounded"></div>
              </div>
            ) : (
              <div className={`flex items-center gap-2 bg-background rounded-lg border px-3 py-1.5 shadow-sm ${
                searchQuery.trim() !== ""
                  ? "border-primary"
                  : "border-border"
              }`}>
                <Search className={`h-4 w-4 ${searchQuery.trim() !== "" ? "text-primary" : "text-muted-foreground"}`} />
                <Input
                  type="text"
                  placeholder={`Search from ${sortedTransactions.length} ${sortedTransactions.length === 1 ? 'transaction' : 'transactions'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`!border-0 !ring-0 !outline-none !ring-offset-0 focus-visible:!ring-0 focus:!ring-0 focus:!outline-none focus-visible:!outline-none focus:!border-0 focus-visible:!border-0 focus-visible:!ring-offset-0 h-8 w-full min-w-0 bg-transparent ${
                    searchQuery.trim() !== "" ? "text-primary placeholder:text-primary/70" : ""
                  }`}
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                />
                {searchQuery.trim() !== "" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-primary hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={() => {
                      setSearchQuery("");
                    }}
                  >
                    <span className="sr-only">Clear search</span>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Filter Section */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1.5 px-0.5">
            {(() => {
              // Define filter buttons with their configurations
              const filterButtons = [
                {
                  id: 'date',
                  isActive: dateFilter !== "allTime",
                  order: 0,
                  render: () => (
                    <div key="date" className="relative flex-shrink-0 z-10">
                      <Button
                        variant="outline"
                        onClick={() => setIsDateFilterOpen(true)}
                        className={`whitespace-nowrap justify-start shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] relative ${dateFilter !== "allTime" ? "pr-8" : ""} ${
                          dateFilter !== "allTime"
                            ? "border-primary text-primary bg-transparent"
                            : ""
                        }`}
                      >
                        <CalendarDays className={`h-4 w-4 mr-2 ${dateFilter !== "allTime" ? "text-primary" : ""}`} />
                        <span className={dateFilter !== "allTime" ? "text-primary" : ""}>
                          {dateFilter === "allTime" ? "All Time" :
                           dateFilter === "today" ? "Today" :
                           dateFilter === "yesterday" ? "Yesterday" :
                           dateFilter === "thisMonth" ? "This Month" :
                           dateFilter === "lastMonth" ? "Last Month" :
                           dateFilter === "singleDay" ? (singleDate ? formatDate(singleDate) : "Single Day") :
                           dateFilter === "dateRange" ? (dateRangeStart && dateRangeEnd ? `${formatDate(dateRangeStart)} - ${formatDate(dateRangeEnd)}` : "Date Range") : "Date"}
                        </span>
                      </Button>
                      {dateFilter !== "allTime" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDateFilter("allTime");
                            setSingleDate("");
                            setDateRangeStart("");
                            setDateRangeEnd("");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5 text-primary" />
                        </button>
                      )}
                    </div>
                  )
                },
                {
                  id: 'type',
                  isActive: typeFilter !== "all",
                  order: 1,
                  render: () => (
                    <div key="type" className="relative flex-shrink-0 z-10">
                      <Button
                        variant="outline"
                        onClick={() => setIsTypeFilterOpen(true)}
                        className={`whitespace-nowrap justify-start shadow-sm relative ${typeFilter !== "all" ? "pr-8" : ""} ${
                          typeFilter !== "all"
                            ? "border-primary text-primary bg-transparent"
                            : ""
                        }`}
                      >
                        <Filter className={`h-4 w-4 mr-2 ${typeFilter !== "all" ? "text-primary" : ""}`} />
                        <span className={typeFilter !== "all" ? "text-primary" : ""}>
                          {typeFilter === "all" ? "All Type" :
                           typeFilter === "income" ? "Income" :
                           typeFilter === "expense" ? "Expense" : "Type"}
                        </span>
                      </Button>
                      {typeFilter !== "all" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTypeFilter("all");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5 text-primary" />
                        </button>
                      )}
                    </div>
                  )
                },
                {
                  id: 'member',
                  isActive: memberFilter !== "all",
                  order: 2,
                  render: () => (
                    <div key="member" className="relative flex-shrink-0 z-10">
                      <Button
                        variant="outline"
                        onClick={() => setIsMemberFilterOpen(true)}
                        className={`whitespace-nowrap justify-start shadow-sm relative ${memberFilter !== "all" ? "pr-8" : ""} ${
                          memberFilter !== "all"
                            ? "border-primary text-primary bg-transparent"
                            : ""
                        }`}
                      >
                        <Users className={`h-4 w-4 mr-2 ${memberFilter !== "all" ? "text-primary" : ""}`} />
                        <span className={memberFilter !== "all" ? "text-primary" : ""}>
                          {memberFilter === "all" ? "All Members" : memberFilter}
                        </span>
                      </Button>
                      {memberFilter !== "all" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberFilter("all");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5 text-primary" />
                        </button>
                      )}
                    </div>
                  )
                },
                {
                  id: 'party',
                  isActive: partyFilter !== "all",
                  order: 3,
                  render: () => (
                    <div key="party" className="relative flex-shrink-0 z-10">
                      <Button
                        variant="outline"
                        onClick={() => setIsPartyFilterOpen(true)}
                        className={`whitespace-nowrap justify-start shadow-sm relative ${partyFilter !== "all" ? "pr-8" : ""} ${
                          partyFilter !== "all"
                            ? "border-primary text-primary bg-transparent"
                            : ""
                        }`}
                      >
                        <User className={`h-4 w-4 mr-2 ${partyFilter !== "all" ? "text-primary" : ""}`} />
                        <span className={partyFilter !== "all" ? "text-primary" : ""}>
                          {partyFilter === "all" ? "All Parties" : partyFilter}
                        </span>
                      </Button>
                      {partyFilter !== "all" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPartyFilter("all");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5 text-primary" />
                        </button>
                      )}
                    </div>
                  )
                }
              ];

              // Sort: active filters first (maintaining their relative order), then inactive filters (maintaining their relative order)
              const sortedFilters = [...filterButtons].sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return a.order - b.order;
              });

              return sortedFilters.map(filter => filter.render());
            })()}
          </div>

        </section>

        {/* Transactions List */}
        <section className={sortedTransactions.length === 0 && !loading ? "flex-1 flex flex-col" : ""}>

          <div className={sortedTransactions.length === 0 && !loading ? "flex-1 flex items-center justify-center" : "space-y-4"}>
            {loading ? (
              <div className="space-y-3">
                {/* Skeleton loader for transactions */}
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border border-border shadow-sm animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-muted"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted rounded"></div>
                            <div className="h-3 w-24 bg-muted rounded"></div>
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          <div className="h-5 w-20 bg-muted rounded"></div>
                          <div className="h-3 w-16 bg-muted rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="text-center">
                {(() => {
                  // Check if any filter is applied
                  const hasActiveFilters = 
                    searchQuery.trim() !== "" ||
                    dateFilter !== "allTime" ||
                    typeFilter !== "all" ||
                    memberFilter !== "all" ||
                    partyFilter !== "all";
                  
                  if (hasActiveFilters) {
                    return (
                      <>
                        <div className="text-6xl mb-4 opacity-50">🔍</div>
                        <h3 className="text-sm font-semibold mb-2">No transactions found</h3>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your filter or search query
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <div className="text-6xl mb-4 opacity-50">➕</div>
                        <h3 className="text-sm font-semibold mb-2">No transactions yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Tap the ➕ button to add your first transaction
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
            ) : (
              Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
                <div key={date} className="space-y-2.5">
                  <div className="sticky top-0 bg-gray-50 dark:bg-background pb-0 pt-1 z-10">
                    <h3 className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded bg-transparent dark:bg-transparent inline-block">{date}</h3>
                  </div>
                  {dateTransactions.map((transaction) => {
                    const currentUserRole = bookRoles[selectedBookId || 0];
                    const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor';
                    const canView = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor' || currentUserRole === 'viewer';
                    
                    return (
                    <Card 
                      key={transaction.id} 
                      className={`border border-border shadow-sm transition-shadow ${
                        canView ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={async () => {
                        if (canEdit) {
                          handleEditTransaction(transaction);
                        } else if (currentUserRole === 'viewer') {
                          // Viewers can click to view history
                          setEditingTransaction(transaction);
                          await fetchTransactionHistory(transaction.id);
                          setIsHistoryDialogOpen(true);
                        }
                      }}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {(() => {
                              const { icon: Icon, arrowColor, bgColor } = getTransactionTypeIcon(transaction.type);
                              return (
                                <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`h-4 w-4 ${arrowColor}`} />
                                </div>
                              );
                            })()}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm truncate">{transaction.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{transaction.addedBy}</p>
                            </div>
                          </div>
                           <div className="text-right">
                             <div className={`text-sm ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                               {transaction.type === "income" ? "+" : "-"} ₹{formatIndianNumber(transaction.amount)}
                             </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ₹{formatIndianNumber(balanceMap.get(transaction.id) || 0)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </section>
              </>
            ) : null}
          </>
        )}

        {/* Reports Page - Placeholder */}
        {activeTab === "reports" && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-base font-semibold mb-2">Reports</h2>
              <p className="text-muted-foreground">Coming soon</p>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        <Dialog open={isProfileOpen} onOpenChange={(open) => {
          setIsProfileOpen(open);
          if (!open) {
            setIsNameEditing(false);
            // Reset to original values if cancelled
            // Refresh profile data from user metadata when modal closes
            if (user) {
              fetchUserProfile();
            }
            setProfileData(originalProfileData);
          }
        }}>
          <DialogContent 
            className="max-h-[85vh] overflow-y-auto overflow-x-hidden"
            onWheel={(e) => e.stopPropagation()}
            onScroll={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Profile</DialogTitle>
              <DialogDescription className="sr-only">Manage your profile information</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">

              {/* Profile Avatar Section */}
              <div className="flex flex-col items-center py-4">
                <div className={`h-20 w-20 rounded-full bg-gradient-to-r ${getGradientFromEmail(profileData.email)} flex items-center justify-center mb-3`}>
                  <span className="text-lg font-semibold text-white">
                    {getInitials(profileData.name)}
                  </span>
                </div>
                <h2 className="text-sm font-semibold mb-1">{profileData.name}</h2>
                <p className="text-sm text-muted-foreground">{profileData.email}</p>
              </div>

              {/* Profile Form */}
              <div className="space-y-4">
                <Card className="border border-border">
                  <CardContent className="p-0">
                    <div className="space-y-4 p-4">
                      {/* Name Field */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="profileName" className="text-foreground text-xs font-medium">Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground" />
                          <Input
                            id="profileName"
                            placeholder="Enter your name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className={`pl-10 pr-20 ${isNameEditing ? "text-foreground" : "bg-muted text-foreground"}`}
                            maxLength={100}
                            disabled={!isNameEditing}
                            readOnly={!isNameEditing}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {!isNameEditing ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsNameEditing(true)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setIsNameEditing(false);
                                  setProfileData({ ...profileData, name: originalProfileData.name });
                                }}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="profileEmail" className="text-foreground text-xs font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground" />
                          <Input
                            id="profileEmail"
                            type="email"
                            placeholder="Enter your email"
                            value={profileData.email}
                            className="pl-10 bg-muted text-foreground"
                            disabled
                            readOnly
                          />
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <Button 
                  onClick={async () => {
                    try {
                      setProfileLoading(true);

                      // Get old name before updating
                      const oldName = originalProfileData.name;
                      const newName = profileData.name;

                      // Update user_metadata with new name
                      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
                        data: {
                          name: profileData.name
                        }
                      });

                      if (updateError) {
                        throw updateError;
                      }

                      // Update all transactions where added_by matches the old name
                      if (oldName !== newName && oldName) {
                        try {
                          const { error: updateTransactionsError } = await supabase
                            .from('transactions')
                            .update({ added_by: newName })
                            .eq('added_by', oldName);

                          if (updateTransactionsError) {
                            console.error('Error updating transactions:', updateTransactionsError);
                            // Don't throw - name update succeeded, transaction update is secondary
                            toast.warning("Name updated, but some transactions may still show old name");
                          } else {
                            // Refresh transactions to show updated names
                            if (selectedBookId) {
                              await fetchTransactions();
                            }
                            toast.success("Profile and all transactions updated successfully");
                          }
                        } catch (error) {
                          console.error('Error updating transactions:', error);
                          // Continue even if transaction update fails
                          toast.success("Profile updated successfully");
                        }
                      } else {
                        toast.success("Profile updated successfully");
                      }

                      // Refresh session to ensure latest data is synced
                      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                      
                      // Update local user state if update was successful
                      if (updatedUser?.user) {
                        setUser(updatedUser.user);
                      } else if (refreshedSession?.user) {
                        setUser(refreshedSession.user);
                      }

                      setOriginalProfileData({ ...profileData });
                      setIsNameEditing(false);
                      setIsProfileOpen(false);
                    } catch (error) {
                      console.error('Error saving profile:', error);
                      toast.error('Failed to update profile. Please try again.');
                    } finally {
                      setProfileLoading(false);
                    }
                  }}
                  disabled={profileData.name === originalProfileData.name || profileLoading}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* Date Filter Dialog */}
      <Dialog open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter by Date</DialogTitle>
            <DialogDescription className="sr-only">Filter transactions by date range</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="space-y-2">
                <Button
                  variant={dateFilter === "allTime" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setDateFilter("allTime");
                    setIsDateFilterOpen(false);
                  }}
                >
                  All Time
                </Button>
                <Button
                  variant={dateFilter === "today" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setDateFilter("today");
                    setIsDateFilterOpen(false);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant={dateFilter === "yesterday" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setDateFilter("yesterday");
                    setIsDateFilterOpen(false);
                  }}
                >
                  Yesterday
                </Button>
                <Button
                  variant={dateFilter === "thisMonth" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setDateFilter("thisMonth");
                    setIsDateFilterOpen(false);
                  }}
                >
                  This Month
                </Button>
                <Button
                  variant={dateFilter === "lastMonth" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setDateFilter("lastMonth");
                    setIsDateFilterOpen(false);
                  }}
                >
                  Last Month
                </Button>
                <Button
                  variant={dateFilter === "singleDay" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    // Reset date values if switching from dateRange to singleDay
                    if (dateFilter === "dateRange") {
                      setDateRangeStart("");
                      setDateRangeEnd("");
                    }
                    // Pre-fill singleDate if singleDay filter is already active, otherwise reset
                    if (dateFilter !== "singleDay") {
                      setSingleDate("");
                    }
                    setPendingDateFilter("singleDay");
                    // Set default to today's date if not already set
                    if (!singleDate) {
                      setSingleDate(getISTDateString());
                    }
                    setIsDateFilterOpen(false);
                    setIsDatePickerOpen(true);
                  }}
                >
                  Single Day
                </Button>
                <Button
                  variant={dateFilter === "dateRange" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    // Reset date values if switching from singleDay to dateRange
                    if (dateFilter === "singleDay") {
                      setSingleDate("");
                    }
                    // Pre-fill date range if dateRange filter is already active, otherwise reset
                    if (dateFilter !== "dateRange") {
                      setDateRangeStart("");
                      setDateRangeEnd("");
                    }
                    setPendingDateFilter("dateRange");
                    // Set default to today's date for both start and end if not already set
                    if (!dateRangeStart) {
                      setDateRangeStart(getISTDateString());
                    }
                    if (!dateRangeEnd) {
                      setDateRangeEnd(getISTDateString());
                    }
                    setIsDateFilterOpen(false);
                    setIsDatePickerOpen(true);
                  }}
                >
                  Date Range
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={(open) => {
        setIsSettingsModalOpen(open);
        // Close password change modal if settings modal is closed
        if (!open && isPasswordChangeModalOpen) {
          setIsPasswordChangeModalOpen(false);
          setPasswordData({
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }
        // Close logout confirmation modal if settings modal is closed
        if (!open && isLogoutConfirmOpen) {
          setIsLogoutConfirmOpen(false);
          setLogoutLoading(false);
        }
      }}>
        <DialogContent 
          className="max-h-[85vh] overflow-y-auto overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription className="sr-only">Manage your settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Account Section */}
            <div>
              <h2 className="text-sm font-semibold mb-3 px-1">Account</h2>
              <Card className="border border-border">
                <CardContent className="p-0">
                  <button 
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      setIsProfileOpen(true);
                      // Initialize original data when opening profile
                      setOriginalProfileData({ ...profileData });
                      setIsNameEditing(false);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Profile</p>
                        <p className="text-sm text-muted-foreground">Manage your profile information</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Password Change Section */}
            <div>
              <Card className="border border-border">
                <CardContent className="p-0">
                  <button 
                    onClick={() => {
                      setIsPasswordChangeModalOpen(true);
                      setPasswordData({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium">Change Password</p>
                        <p className="text-xs text-muted-foreground">Update your account password</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Notifications Section */}
            <div>
              <h2 className="text-xs font-semibold mb-3 px-1">Notifications</h2>
              <Card className="border border-border">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                        <Bell className="h-5 w-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium">Browser Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive notifications</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (browserNotificationsEnabled) {
                          setBrowserNotificationsEnabled(false);
                          localStorage.setItem('browserNotificationsEnabled', 'false');
                          toast.info('Browser notifications disabled');
                        } else {
                          await requestNotificationPermission();
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        browserNotificationsEnabled && notificationPermission === 'granted'
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                      disabled={notificationPermission === 'denied'}
                    >
                      <span
                        className={`absolute h-4 w-4 rounded-full bg-white shadow-md transition-all duration-200 ease-in-out ${
                          browserNotificationsEnabled && notificationPermission === 'granted'
                            ? 'left-[22px]'
                            : 'left-[2px]'
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* About Section */}
            <div>
              <h2 className="text-xs font-semibold mb-3 px-1">About</h2>
              <Card className="border border-border">
                <CardContent className="p-0">
                  <button 
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      setIsAboutModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                        <Info className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">About Us</p>
                        <p className="text-sm text-muted-foreground">Learn more about the app</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Password Change Dialog */}
            <Dialog open={isPasswordChangeModalOpen} onOpenChange={(open) => {
              setIsPasswordChangeModalOpen(open);
              if (!open) {
                // Reset password data when closing
                setPasswordData({
                  oldPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
                setShowPasswords({
                  oldPassword: false,
                  newPassword: false,
                  confirmPassword: false,
                });
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and new password. Make sure the new password is at least 6 characters long.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="oldPassword" className="text-xs font-medium">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="oldPassword"
                        type={showPasswords.oldPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        value={passwordData.oldPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, oldPassword: e.target.value })
                        }
                        className="text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, oldPassword: !showPasswords.oldPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.oldPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="newPassword" className="text-xs font-medium">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.newPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        className="text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, newPassword: !showPasswords.newPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.newPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        className="text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPasswordChangeModalOpen(false);
                      setPasswordData({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    disabled={isChangingPassword}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Logout Section */}
            <div className="pt-4">
              <Button 
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                variant="outline"
                disabled={logoutLoading}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutConfirmOpen} onOpenChange={(open) => {
        setIsLogoutConfirmOpen(open);
        if (!open) {
          setLogoutLoading(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              className="bg-gray-100 hover:bg-gray-200"
              onClick={() => {
                setIsLogoutConfirmOpen(false);
                setLogoutLoading(false);
              }}
              disabled={logoutLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleLogout}
              disabled={logoutLoading}
            >
              {logoutLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Logging out...
                </>
              ) : (
                'Logout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About Us Modal */}
      <Dialog open={isAboutModalOpen} onOpenChange={setIsAboutModalOpen}>
        <DialogContent 
          className="max-h-[85vh] overflow-y-auto overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>About</DialogTitle>
            <DialogDescription className="sr-only">Learn more about the app</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Developer Section */}
            <Card className="border border-border bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-6">
                <h3 className="text-base font-semibold mb-6 text-center">Developed By</h3>
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mb-4">
                    <User className="h-10 w-10 text-white" />
                  </div>
                  <h4 className="text-lg font-bold mb-2">Chinmaya Kapopara</h4>
                  <p className="text-muted-foreground mb-4">Enthusiatic Entrepreneur</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <Mail className="h-4 w-4" />
                    <a href="mailto:kapopara.king@gmail.com" className="hover:text-primary transition-colors">
                      kapopara.king@gmail.com
                    </a>
                  </div>
                  <div className="max-w-md">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Passionate about creating intuitive and user-friendly applications that make everyday tasks simpler. 
                      This app was built with attention to detail and a focus on providing the best user experience.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Picker Dialog */}
      <Dialog open={isDatePickerOpen} onOpenChange={(open) => {
        setIsDatePickerOpen(open);
        if (!open) {
          // Reset date values when closing without applying
          setSingleDate("");
          setDateRangeStart("");
          setDateRangeEnd("");
          setPendingDateFilter(null);
        }
      }}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{pendingDateFilter === "singleDay" ? "Select Date" : "Select Date Range"}</DialogTitle>
            <DialogDescription className="sr-only">{pendingDateFilter === "singleDay" ? "Select a single date" : "Select a date range"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pendingDateFilter === "singleDay" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="singleDate" className="text-xs font-medium">Select Date</Label>
                <div className="relative">
                  <Input
                    id="singleDate"
                    type="text"
                    placeholder="dd-mm-yyyy"
                    value={singleDate ? formatDateToDDMMYYYY(singleDate) : formatDateToDDMMYYYY(getISTDateString())}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Remove non-digit and non-dash characters
                      value = value.replace(/[^\d-]/g, "");
                      // Auto-format as user types: dd-mm-yyyy
                      if (value.length <= 2) {
                        // Just day
                        value = value;
                      } else if (value.length <= 5) {
                        // Day and month
                        value = value.slice(0, 2) + "-" + value.slice(2);
                      } else {
                        // Day, month, and year
                        value = value.slice(0, 2) + "-" + value.slice(2, 4) + "-" + value.slice(4, 8);
                      }
                      // Convert to YYYY-MM-DD for storage
                      const isoDate = parseDDMMYYYYToISO(value);
                      if (isoDate) {
                        setSingleDate(isoDate);
                      } else if (value.length === 0) {
                        setSingleDate(getISTDateString());
                      }
                    }}
                    onBlur={(e) => {
                      // Validate and ensure proper format on blur
                      const value = e.target.value;
                      if (value) {
                        const isoDate = parseDDMMYYYYToISO(value);
                        if (isoDate) {
                          setSingleDate(isoDate);
                        } else {
                          // Invalid date, reset to today
                          setSingleDate(getISTDateString());
                          toast.error("Invalid date format. Please use dd-mm-yyyy");
                        }
                      } else {
                        setSingleDate(getISTDateString());
                      }
                    }}
                    className={`${!singleDate ? "text-muted-foreground" : "text-foreground"} pr-10`}
                    maxLength={10}
                  />
                  <input
                    type="date"
                    id="single-date-picker-hidden"
                    value={singleDate || getISTDateString()}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSingleDate(e.target.value);
                      }
                    }}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    max={getISTDate().toISOString().split("T")[0]}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const hiddenInput = document.getElementById('single-date-picker-hidden') as HTMLInputElement;
                      if (hiddenInput && 'showPicker' in hiddenInput) {
                        hiddenInput.showPicker();
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {pendingDateFilter === "dateRange" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dateRangeStart" className="text-xs font-medium">From Date</Label>
                  <div className="relative">
                    <Input
                      id="dateRangeStart"
                      type="text"
                      placeholder="dd-mm-yyyy"
                      value={dateRangeStart ? formatDateToDDMMYYYY(dateRangeStart) : formatDateToDDMMYYYY(getISTDateString())}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Remove non-digit and non-dash characters
                        value = value.replace(/[^\d-]/g, "");
                        // Auto-format as user types: dd-mm-yyyy
                        if (value.length <= 2) {
                          // Just day
                          value = value;
                        } else if (value.length <= 5) {
                          // Day and month
                          value = value.slice(0, 2) + "-" + value.slice(2);
                        } else {
                          // Day, month, and year
                          value = value.slice(0, 2) + "-" + value.slice(2, 4) + "-" + value.slice(4, 8);
                        }
                        // Convert to YYYY-MM-DD for storage
                        const isoDate = parseDDMMYYYYToISO(value);
                        if (isoDate) {
                          setDateRangeStart(isoDate);
                        } else if (value.length === 0) {
                          setDateRangeStart(getISTDateString());
                        }
                      }}
                      onBlur={(e) => {
                        // Validate and ensure proper format on blur
                        const value = e.target.value;
                        if (value) {
                          const isoDate = parseDDMMYYYYToISO(value);
                          if (isoDate) {
                            setDateRangeStart(isoDate);
                          } else {
                            // Invalid date, reset to today
                            setDateRangeStart(getISTDateString());
                            toast.error("Invalid date format. Please use dd-mm-yyyy");
                          }
                        } else {
                          setDateRangeStart(getISTDateString());
                        }
                      }}
                      className={`${!dateRangeStart ? "text-muted-foreground" : "text-foreground"} pr-10`}
                      maxLength={10}
                    />
                    <input
                      type="date"
                      id="date-range-start-picker-hidden"
                      value={dateRangeStart || getISTDateString()}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDateRangeStart(e.target.value);
                        }
                      }}
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                      max={dateRangeEnd || getISTDate().toISOString().split("T")[0]}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const hiddenInput = document.getElementById('date-range-start-picker-hidden') as HTMLInputElement;
                        if (hiddenInput && 'showPicker' in hiddenInput) {
                          hiddenInput.showPicker();
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dateRangeEnd" className="text-xs font-medium">To Date</Label>
                  <div className="relative">
                    <Input
                      id="dateRangeEnd"
                      type="text"
                      placeholder="dd-mm-yyyy"
                      value={dateRangeEnd ? formatDateToDDMMYYYY(dateRangeEnd) : formatDateToDDMMYYYY(getISTDateString())}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Remove non-digit and non-dash characters
                        value = value.replace(/[^\d-]/g, "");
                        // Auto-format as user types: dd-mm-yyyy
                        if (value.length <= 2) {
                          // Just day
                          value = value;
                        } else if (value.length <= 5) {
                          // Day and month
                          value = value.slice(0, 2) + "-" + value.slice(2);
                        } else {
                          // Day, month, and year
                          value = value.slice(0, 2) + "-" + value.slice(2, 4) + "-" + value.slice(4, 8);
                        }
                        // Convert to YYYY-MM-DD for storage
                        const isoDate = parseDDMMYYYYToISO(value);
                        if (isoDate) {
                          setDateRangeEnd(isoDate);
                        } else if (value.length === 0) {
                          setDateRangeEnd(getISTDateString());
                        }
                      }}
                      onBlur={(e) => {
                        // Validate and ensure proper format on blur
                        const value = e.target.value;
                        if (value) {
                          const isoDate = parseDDMMYYYYToISO(value);
                          if (isoDate) {
                            setDateRangeEnd(isoDate);
                          } else {
                            // Invalid date, reset to today
                            setDateRangeEnd(getISTDateString());
                            toast.error("Invalid date format. Please use dd-mm-yyyy");
                          }
                        } else {
                          setDateRangeEnd(getISTDateString());
                        }
                      }}
                      className={`${dateRangeStart ? "!text-foreground" : (!dateRangeEnd ? "text-muted-foreground" : "text-foreground")} pr-10`}
                      style={dateRangeStart ? { color: 'hsl(var(--foreground))' } : undefined}
                      maxLength={10}
                    />
                    <input
                      type="date"
                      id="date-range-end-picker-hidden"
                      value={dateRangeEnd || getISTDateString()}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDateRangeEnd(e.target.value);
                        }
                      }}
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                      min={dateRangeStart || undefined}
                      max={getISTDate().toISOString().split("T")[0]}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const hiddenInput = document.getElementById('date-range-end-picker-hidden') as HTMLInputElement;
                        if (hiddenInput && 'showPicker' in hiddenInput) {
                          hiddenInput.showPicker();
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                if (pendingDateFilter) {
                  setDateFilter(pendingDateFilter);
                }
                setIsDatePickerOpen(false);
                setPendingDateFilter(null);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Filter Dialog */}
      <Dialog open={isTypeFilterOpen} onOpenChange={setIsTypeFilterOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter by Type</DialogTitle>
            <DialogDescription className="sr-only">Filter transactions by type (income or expense)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setTypeFilter("all");
                  setIsTypeFilterOpen(false);
                }}
              >
                All Type
              </Button>
              <Button
                variant={typeFilter === "income" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setTypeFilter("income");
                  setIsTypeFilterOpen(false);
                }}
              >
                Income
              </Button>
              <Button
                variant={typeFilter === "expense" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setTypeFilter("expense");
                  setIsTypeFilterOpen(false);
                }}
              >
                Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Filter Dialog */}
      <Dialog open={isMemberFilterOpen} onOpenChange={setIsMemberFilterOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter by Member</DialogTitle>
            <DialogDescription className="sr-only">Filter transactions by book member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Button
                variant={memberFilter === "all" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setMemberFilter("all");
                  setIsMemberFilterOpen(false);
                }}
              >
                All Members
              </Button>
              {bookMembers.map((member) => {
                const memberName = member.name || member.email.split('@')[0];
                return (
                  <Button
                    key={member.email}
                    variant={memberFilter === memberName ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      setMemberFilter(memberName);
                      setIsMemberFilterOpen(false);
                    }}
                  >
                    {memberName}
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Party Filter Dialog */}
      <Dialog open={isPartyFilterOpen} onOpenChange={(open) => {
        setIsPartyFilterOpen(open);
        if (!open) {
          setOpenPartyMenu(null);
        }
      }}>
        <DialogContent className="max-w-md sm:max-w-lg overflow-visible max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Filter by Party</DialogTitle>
            <DialogDescription className="sr-only">Filter transactions by party</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-visible max-h-[70vh] overflow-y-auto pb-10">
            <div className="space-y-2">
              <Button
                variant={partyFilter === "all" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setPartyFilter("all");
                  setIsPartyFilterOpen(false);
                }}
              >
                All Parties
              </Button>
              {parties.map((party) => (
                <div key={party} className="relative overflow-visible">
                  <Button
                    variant={partyFilter === party ? "default" : "outline"}
                    className="w-full justify-between"
                    onClick={() => {
                      setPartyFilter(party);
                      setIsPartyFilterOpen(false);
                    }}
                  >
                    <span className="flex-1 text-left">{party}</span>
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenPartyMenu(openPartyMenu === party ? null : party);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="h-6 w-6 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded z-10 relative cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenPartyMenu(openPartyMenu === party ? null : party);
                        }
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </div>
                  </Button>
                  {openPartyMenu === party && (
                    <div 
                      data-party-menu
                      className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-[100] min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRenameParty(party);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-t-lg text-foreground font-normal"
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteParty(party);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-b-lg text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(() => {
                const currentUserRole = bookRoles[selectedBookId || 0];
                const canManageParties = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor';
                
                if (!canManageParties) return null;
                
                return (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-primary border-border hover:text-primary"
                    onClick={() => {
                      setIsPartyFilterOpen(false);
                      setIsAddPartyDialogOpen(true);
                    }}
                  >
                    + Add Party
                  </Button>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Party Selector Dialog */}
      <Dialog open={isPartySelectorOpen} onOpenChange={(open) => {
        setIsPartySelectorOpen(open);
        // Immediately reset menu state when dialog state changes
        setOpenPartyMenu(null);
      }}>
        <DialogContent className="max-w-md overflow-visible max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select Party</DialogTitle>
            <DialogDescription className="sr-only">Select or manage a party</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[70vh] overflow-y-auto overflow-x-visible pb-10">
            <Button
              variant="outline"
              className={`w-full justify-start font-normal ${
                !formData.party 
                  ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:text-primary-foreground" 
                  : "border border-border hover:text-foreground"
              }`}
              onClick={() => {
                setFormData({ ...formData, party: "" });
                setIsPartySelectorOpen(false);
              }}
            >
              None
            </Button>
            {parties.map((party) => {
              const currentUserRole = bookRoles[selectedBookId || 0];
              const canManageParties = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor';
              const canDeleteParties = currentUserRole === 'owner' || currentUserRole === 'admin';
              
              return (
              <div key={party} className="relative overflow-visible">
                <Button
                  variant="outline"
                  className={`w-full justify-between font-normal ${
                    formData.party === party 
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:text-primary-foreground" 
                      : "border border-border hover:text-foreground"
                  }`}
                  onClick={() => {
                    setFormData({ ...formData, party: party });
                    setIsPartySelectorOpen(false);
                  }}
                >
                  <span className={`flex-1 text-left ${
                    formData.party === party 
                      ? "text-primary-foreground" 
                      : "text-foreground"
                  }`}>{party}</span>
                  {canManageParties && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenPartyMenu(openPartyMenu === party ? null : party);
                      }}
                      className="h-6 w-6 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenPartyMenu(openPartyMenu === party ? null : party);
                        }
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </div>
                  )}
                </Button>
                {canManageParties && openPartyMenu === party && (
                  <div 
                    data-party-menu
                    className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-[100] min-w-[120px]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRenameParty(party);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-t-lg text-foreground font-normal"
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </button>
                    {canDeleteParties && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteParty(party);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-b-lg text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            {(() => {
              const currentUserRole = bookRoles[selectedBookId || 0];
              const canManageParties = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor';
              
              if (!canManageParties) return null;
              
              return (
                <Button
                  variant="outline"
                  className="w-full justify-start text-primary border-border hover:text-primary"
                  onClick={() => {
                    setIsPartySelectorOpen(false);
                    setIsAddPartyDialogOpen(true);
                  }}
                >
                  + Add Party
                </Button>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Party Dialog */}
      <Dialog open={isAddPartyDialogOpen} onOpenChange={setIsAddPartyDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Party</DialogTitle>
            <DialogDescription className="sr-only">Create a new party for transactions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPartyName" className="text-xs font-medium">Party Name</Label>
              <Input
                id="newPartyName"
                placeholder="Enter party name"
                value={newPartyName}
                maxLength={30}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length > 30) {
                    toast.error('Party name cannot exceed 30 characters');
                    return;
                  }
                  setNewPartyName(value);
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsAddPartyDialogOpen(false);
              setNewPartyName("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddParty}>
              Add Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Party Dialog */}
      <Dialog open={isRenamePartyDialogOpen} onOpenChange={(open) => {
        setIsRenamePartyDialogOpen(open);
        if (!open) {
          setEditingParty("");
          setNewPartyName("");
          setOriginalPartyName("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Party</DialogTitle>
            <DialogDescription className="sr-only">Rename the selected party</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This will update the party name in all existing transactions that use it.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="renamePartyName" className="text-xs font-medium">Party Name</Label>
              <Input
                id="renamePartyName"
                placeholder="Enter party name"
                value={newPartyName}
                maxLength={30}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length > 30) {
                    toast.error('Party name cannot exceed 30 characters');
                    return;
                  }
                  setNewPartyName(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newPartyName.trim() !== originalPartyName.trim() && newPartyName.trim()) {
                      handleRenameParty();
                    }
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsRenamePartyDialogOpen(false);
              setEditingParty("");
              setNewPartyName("");
              setOriginalPartyName("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameParty}
              disabled={newPartyName.trim() === originalPartyName.trim() || !newPartyName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Party Confirmation Dialog */}
      <Dialog open={isDeletePartyConfirmOpen} onOpenChange={(open) => {
        setIsDeletePartyConfirmOpen(open);
        if (!open) {
          setPartyToDelete("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Party</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{partyToDelete}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This will remove the party from all existing transactions that use it.
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsDeletePartyConfirmOpen(false);
              setPartyToDelete("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteParty}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (open) {
          // Reset form when opening add dialog
          setFormData({
            amount: "",
            description: "",
            addedBy: "",
            party: "",
            date: getISTDateString(),
          });
          setTransactionType("expense");
        } else {
          // Reset form when closing dialog without saving
          setFormData({
            amount: "",
            description: "",
            addedBy: "",
            party: "",
            date: getISTDateString(),
          });
          setTransactionType("expense");
          setIsAmountEditing(false);
        }
      }}>
        <DialogContent 
          className="max-w-md sm:max-w-lg overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <DialogHeader className="pb-2">
            <DialogTitle className="text-left">Add Transaction</DialogTitle>
            <DialogDescription className="sr-only">Add a new income or expense transaction</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 pb-4">
            {/* Transaction Type */}
            <div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={transactionType === "income" ? "default" : "outline"}
                  className={`flex items-center justify-center gap-2 ${transactionType === "income" ? "bg-green-600 hover:bg-green-600 text-white" : ""}`}
                    onClick={() => {
                      setTransactionType("income");
                    }}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Income
                </Button>
                <Button
                  type="button"
                  variant={transactionType === "expense" ? "default" : "outline"}
                  className={`flex items-center justify-center gap-2 ${transactionType === "expense" ? "bg-red-600 hover:bg-red-600 text-white" : ""}`}
                    onClick={() => {
                      setTransactionType("expense");
                    }}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Expense
                </Button>
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount" className="text-xs font-medium">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  inputMode="decimal"
                  className="pl-8"
                  value={formData.amount ? formatAmountDisplay(formData.amount, isAmountEditing) : ''}
                  onFocus={() => setIsAmountEditing(true)}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remove all formatting (commas) to get raw number
                    value = parseIndianNumber(value);
                    // Format and validate the input
                    value = formatAmountForInput(value);
                    
                    // Check if amount exceeds max - prevent entering values above limit
                    const numValue = parseFloat(value);
                    if (value && !isNaN(numValue) && numValue > 10000000000) {
                      toast.error('Maximum amount limit is ₹10,00,00,00,000');
                      // Don't update the form data - keep the previous valid value
                      return;
                    }
                    
                    setFormData({ ...formData, amount: value });
                  }}
                  onBlur={(e) => {
                    setIsAmountEditing(false);
                    // Format on blur for better UX and enforce max limit
                    let value = parseIndianNumber(e.target.value);
                    if (value) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        // Enforce maximum limit - if exceeds, keep last valid value or clear
                        if (numValue > 10000000000) {
                          toast.error('Maximum amount limit is ₹10,00,00,00,000');
                          // Don't update - keep the last valid value that was in formData
                          return;
                        }
                        setFormData({ ...formData, amount: value });
                      }
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description" className="text-xs font-medium">Description</Label>
              <Input
                id="description"
                placeholder="Enter description here"
                value={formData.description}
                maxLength={1000}
                onChange={(e) => {
                  const value = e.target.value;
                  // Prevent entering more than 1000 characters
                  if (value.length > 1000) {
                    toast.error('Description cannot exceed 1000 characters');
                    return;
                  }
                  setFormData({ ...formData, description: value });
                }}
              />
            </div>


            {/* Party */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="party" className="text-xs font-medium">Party (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between hover:text-inherit font-normal"
                onClick={() => {
                  setPartySelectorContext("add");
                  setIsPartySelectorOpen(true);
                }}
              >
                <span className={`${!formData.party ? "text-muted-foreground hover:text-muted-foreground" : "hover:text-foreground"} font-normal`}>
                  {formData.party || "None"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" className="text-xs font-medium">Date</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="text"
                  placeholder="dd-mm-yyyy"
                  value={formData.date ? formatDateToDDMMYYYY(formData.date) : ""}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remove non-digit and non-dash characters
                    value = value.replace(/[^\d-]/g, "");
                    // Auto-format as user types: dd-mm-yyyy
                    if (value.length <= 2) {
                      // Just day
                      value = value;
                    } else if (value.length <= 5) {
                      // Day and month
                      value = value.slice(0, 2) + "-" + value.slice(2);
                    } else {
                      // Day, month, and year
                      value = value.slice(0, 2) + "-" + value.slice(2, 4) + "-" + value.slice(4, 8);
                    }
                    // Convert to YYYY-MM-DD for storage
                    const isoDate = parseDDMMYYYYToISO(value);
                    if (isoDate) {
                      setFormData({ ...formData, date: isoDate });
                    } else if (value.length === 0) {
                      setFormData({ ...formData, date: getISTDateString() });
                    }
                  }}
                  onBlur={(e) => {
                    // Validate and ensure proper format on blur
                    const value = e.target.value;
                    if (value) {
                      const isoDate = parseDDMMYYYYToISO(value);
                      if (isoDate) {
                        setFormData({ ...formData, date: isoDate });
                      } else {
                        // Invalid date, reset to today
                        setFormData({ ...formData, date: getISTDateString() });
                        toast.error("Invalid date format. Please use dd-mm-yyyy");
                      }
                    } else {
                      setFormData({ ...formData, date: getISTDateString() });
                    }
                  }}
                  className="w-full pr-10"
                  maxLength={10}
                />
                <input
                  type="date"
                  id="date-picker-hidden"
                  value={formData.date || getISTDateString()}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({ ...formData, date: e.target.value });
                    }
                  }}
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                  max={getISTDate().toISOString().split("T")[0]}
                />
                <button
                  type="button"
                  onClick={() => {
                    const hiddenInput = document.getElementById('date-picker-hidden') as HTMLInputElement;
                    if (hiddenInput && 'showPicker' in hiddenInput) {
                      hiddenInput.showPicker();
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Calendar className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleAddTransaction}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          // Reset form when closing edit dialog
          setEditingTransaction(null);
          setOriginalTransactionValues(null);
          setFormData({
            amount: "",
            description: "",
            addedBy: "",
            party: "",
            date: getISTDateString(),
          });
          setTransactionType("expense");
        }
      }}>
        <DialogContent 
          className="max-w-md sm:max-w-lg overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogDescription className="sr-only">Edit transaction details</DialogDescription>
            <div className="flex items-center gap-3">
              <DialogTitle>
                {(() => {
                  const currentUserRole = bookRoles[selectedBookId || 0];
                  return currentUserRole === 'viewer' ? 'Transaction Details' : 'Edit Transaction';
                })()}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowHistory}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 pb-4">
            {(() => {
              const currentUserRole = bookRoles[selectedBookId || 0];
              const isViewer = currentUserRole === 'viewer';
              
              return (
                <>
                  {isViewer && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg mb-2">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ℹ️ You are viewing this transaction in read-only mode. You can view the history but cannot make changes.
                      </p>
                    </div>
                  )}
                  {/* Transaction Type */}
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={transactionType === "income" ? "default" : "outline"}
                        className={`flex items-center justify-center gap-2 ${transactionType === "income" ? "bg-green-600 hover:bg-green-600 text-white" : ""}`}
                        onClick={() => {
                          if (!isViewer) {
                            setTransactionType("income");
                          }
                        }}
                        disabled={isViewer}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        Income
                      </Button>
                      <Button
                        type="button"
                        variant={transactionType === "expense" ? "default" : "outline"}
                        className={`flex items-center justify-center gap-2 ${transactionType === "expense" ? "bg-red-600 hover:bg-red-600 text-white" : ""}`}
                        onClick={() => {
                          if (!isViewer) {
                            setTransactionType("expense");
                          }
                        }}
                        disabled={isViewer}
                      >
                        <ArrowDownCircle className="h-4 w-4" />
                        Expense
                      </Button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="editAmount" className="text-xs font-medium">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="editAmount"
                        type="text"
                        placeholder="0.00"
                        inputMode="decimal"
                        className="pl-8"
                        value={formData.amount ? formatAmountDisplay(formData.amount, isAmountEditing) : ''}
                        onFocus={() => {
                          if (!isViewer) {
                            setIsAmountEditing(true);
                          }
                        }}
                        onChange={(e) => {
                          if (isViewer) return;
                          let value = e.target.value;
                          // Remove all formatting (commas) to get raw number
                          value = parseIndianNumber(value);
                          // Format and validate the input
                          value = formatAmountForInput(value);
                          
                          // Check if amount exceeds max - prevent entering values above limit
                          const numValue = parseFloat(value);
                          if (value && !isNaN(numValue) && numValue > 10000000000) {
                            toast.error('Maximum amount limit is ₹10,00,00,00,000');
                            // Don't update the form data - keep the previous valid value
                            return;
                          }
                          
                          setFormData({ ...formData, amount: value });
                        }}
                        onBlur={(e) => {
                          if (isViewer) return;
                          setIsAmountEditing(false);
                          // Format on blur for better UX and enforce max limit
                          let value = parseIndianNumber(e.target.value);
                          if (value) {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              // Enforce maximum limit - if exceeds, keep last valid value or clear
                              if (numValue > 10000000000) {
                                toast.error('Maximum amount limit is ₹10,00,00,00,000');
                                // Don't update - keep the last valid value that was in formData
                                return;
                              }
                              setFormData({ ...formData, amount: value });
                            }
                          }
                        }}
                        disabled={isViewer}
                        readOnly={isViewer}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="editDescription" className="text-xs font-medium">Description</Label>
                    <Input
                      id="editDescription"
                      placeholder="Enter description here"
                      value={formData.description}
                      maxLength={1000}
                      onChange={(e) => {
                        if (isViewer) return;
                        const value = e.target.value;
                        // Prevent entering more than 1000 characters
                        if (value.length > 1000) {
                          toast.error('Description cannot exceed 1000 characters');
                          return;
                        }
                        setFormData({ ...formData, description: value });
                      }}
                      disabled={isViewer}
                      readOnly={isViewer}
                    />
                  </div>

                  {/* Party */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="editParty" className="text-xs font-medium">Party (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between hover:text-inherit font-normal"
                      onClick={() => {
                        if (!isViewer) {
                          setPartySelectorContext("edit");
                          setIsPartySelectorOpen(true);
                        }
                      }}
                      disabled={isViewer}
                    >
                      <span className={`${!formData.party ? "text-muted-foreground hover:text-muted-foreground" : "hover:text-foreground"} font-normal`}>
                        {formData.party || "None"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="editDate" className="text-xs font-medium">Date</Label>
                    <div className="relative">
                      <Input
                        id="editDate"
                        type="text"
                        placeholder="dd-mm-yyyy"
                        value={formData.date ? formatDateToDDMMYYYY(formData.date) : ""}
                        onChange={(e) => {
                          if (isViewer) return;
                          let value = e.target.value;
                          // Remove non-digit and non-dash characters
                          value = value.replace(/[^\d-]/g, "");
                          // Auto-format as user types: dd-mm-yyyy
                          if (value.length <= 2) {
                            // Just day
                            value = value;
                          } else if (value.length <= 5) {
                            // Day and month
                            value = value.slice(0, 2) + "-" + value.slice(2);
                          } else {
                            // Day, month, and year
                            value = value.slice(0, 2) + "-" + value.slice(2, 4) + "-" + value.slice(4, 8);
                          }
                          // Convert to YYYY-MM-DD for storage
                          const isoDate = parseDDMMYYYYToISO(value);
                          if (isoDate) {
                            setFormData({ ...formData, date: isoDate });
                          } else if (value.length === 0) {
                            setFormData({ ...formData, date: getISTDateString() });
                          }
                        }}
                        onBlur={(e) => {
                          if (isViewer) return;
                          // Validate and ensure proper format on blur
                          const value = e.target.value;
                          if (value) {
                            const isoDate = parseDDMMYYYYToISO(value);
                            if (isoDate) {
                              setFormData({ ...formData, date: isoDate });
                            } else {
                              // Invalid date, reset to current value
                              const currentDate = formData.date || getISTDateString();
                              setFormData({ ...formData, date: currentDate });
                              toast.error("Invalid date format. Please use dd-mm-yyyy");
                            }
                          } else {
                            setFormData({ ...formData, date: getISTDateString() });
                          }
                        }}
                        className="w-full pr-10"
                        maxLength={10}
                        disabled={isViewer}
                        readOnly={isViewer}
                      />
                      <input
                        type="date"
                        id="edit-date-picker-hidden"
                        value={formData.date || getISTDateString()}
                        onChange={(e) => {
                          if (!isViewer && e.target.value) {
                            setFormData({ ...formData, date: e.target.value });
                          }
                        }}
                        className="absolute opacity-0 pointer-events-none w-0 h-0"
                        max={getISTDate().toISOString().split("T")[0]}
                        disabled={isViewer}
                      />
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => {
                            const hiddenInput = document.getElementById('edit-date-picker-hidden') as HTMLInputElement;
                            if (hiddenInput && 'showPicker' in hiddenInput) {
                              hiddenInput.showPicker();
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <DialogFooter className="flex flex-col gap-2">
            {(() => {
              const currentUserRole = bookRoles[selectedBookId || 0];
              const isViewer = currentUserRole === 'viewer';
              const canDelete = currentUserRole === 'owner' || currentUserRole === 'admin';
              
              // Viewers can only view, not update or delete
              if (isViewer) {
                return (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setIsHistoryDialogOpen(true);
                    }}
                    className="w-full"
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                );
              }
              
              // Non-viewers can update and delete (if permitted)
              return (
                <>
                  <Button 
                    onClick={handleUpdateTransaction} 
                    className="w-full"
                    disabled={!hasTransactionChanges}
                  >
                    Update
                  </Button>
                  {canDelete && (
                    <Button 
                      variant="outline"
                      className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              className="bg-gray-100 hover:bg-gray-200"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteTransaction}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent 
          className="max-w-md sm:max-w-lg max-h-[80vh] overflow-y-auto overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              View all changes made to this transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {transactionHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No history available for this transaction.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactionHistory.map((history, index) => (
                  <Card key={history.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold capitalize">{history.change_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const date = getISTDate(history.created_at);
                              const dateStr = date.toLocaleDateString("en-GB", { 
                                day: "2-digit", 
                                month: "2-digit", 
                                year: "numeric",
                                timeZone: "Asia/Kolkata"
                              });
                              const timeStr = date.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                                timeZone: "Asia/Kolkata"
                              });
                              return `${dateStr} ${timeStr}`;
                            })()}
                          </p>
                        </div>
                        {history.changed_by && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {history.changed_by}
                          </span>
                        )}
                      </div>
                      
                      {history.change_type === 'updated' && history.old_values && history.new_values && (
                        <div className="space-y-2 text-sm">
                          {Object.keys(history.new_values).map((key) => {
                            const oldVal = history.old_values[key];
                            const newVal = history.new_values[key];
                            if (oldVal !== newVal) {
                              return (
                                <div key={key} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                                  <div className="flex-1">
                                    <p className="font-medium capitalize mb-1">{key.replace('_', ' ')}</p>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-green-600 text-xs">New:</span>
                                        <span className="text-xs font-medium">{formatHistoryValue(key, newVal)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-red-600 text-xs">Old:</span>
                                        <span className="text-xs line-through">{formatHistoryValue(key, oldVal)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                      
                      {history.change_type === 'created' && history.new_values && (
                        <div className="space-y-2 text-sm">
                          <p className="font-medium mb-2">Initial values:</p>
                          <div className="space-y-1">
                            {Object.entries(history.new_values).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                <span className="font-medium capitalize text-xs w-24">{key.replace('_', ' ')}:</span>
                                <span className="text-xs">{formatHistoryValue(key, value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>

      {/* Book Selector Dialog */}
      <Dialog open={isBookSelectorOpen} onOpenChange={setIsBookSelectorOpen}>
        <DialogContent className="max-w-md overflow-visible max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select Book</DialogTitle>
            <DialogDescription className="sr-only">Select or create a book to organize transactions</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4 max-h-[70vh] overflow-y-auto overflow-x-visible pb-6">
            {books.map((book) => (
              <div
                key={book.id}
                className={`flex items-center gap-2 rounded-lg transition-colors ${
                  selectedBookId === book.id 
                    ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold' 
                    : 'border border-border'
                }`}
              >
                <button
                  onClick={() => handleBookSwitch(book.id)}
                  className={`flex-1 text-left px-4 py-3 rounded-l-lg transition-colors min-w-0 overflow-hidden ${
                    selectedBookId === book.id 
                      ? '' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <span className="truncate block">{book.name}</span>
                </button>
                {/* Only show menu button for owners */}
                {bookRoles[book.id] === 'owner' && (
                  <div className="relative pr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${selectedBookId === book.id ? 'text-primary-foreground hover:bg-white/20' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenBookMenuId(openBookMenuId === book.id ? null : book.id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {openBookMenuId === book.id && (
                      <div 
                        data-book-menu
                        className="absolute right-2 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRenameBook(book);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-t-lg text-foreground font-normal"
                        >
                          <Pencil className="h-4 w-4" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteBook(book.id);
                          }}
                          className="w-full text-left px-4 py-2 transition-colors flex items-center gap-2 rounded-b-lg font-normal text-red-600 hover:bg-accent"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div>
              <button
                onClick={() => {
                  setIsBookSelectorOpen(false);
                  setIsBookDialogOpen(true);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors text-primary font-medium border border-border"
              >
                + Create New Book
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Book Dialog */}
      <Dialog open={isRenameBookDialogOpen} onOpenChange={(open) => {
        setIsRenameBookDialogOpen(open);
        if (!open) {
          setEditingBook(null);
          setNewBookName("");
          setOriginalBookName("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Book</DialogTitle>
            <DialogDescription className="sr-only">Rename the selected book</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="renameBookName">Book Name</Label>
              <Input
                id="renameBookName"
                placeholder="Enter book name"
                value={newBookName}
                maxLength={30}
                onChange={(e) => {
                  const value = e.target.value;
                  // Prevent entering more than 30 characters
                  if (value.length > 30) {
                    toast.error('Book name cannot exceed 30 characters');
                    return;
                  }
                  setNewBookName(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBookName.trim() !== originalBookName.trim()) {
                    handleRenameBook();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              className="bg-gray-100 hover:bg-gray-200"
              onClick={() => {
                setIsRenameBookDialogOpen(false);
                setEditingBook(null);
                setNewBookName("");
                setOriginalBookName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameBook}
              disabled={newBookName.trim() === originalBookName.trim() || !newBookName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Book Confirmation Dialog */}
      <Dialog open={isDeleteBookConfirmOpen} onOpenChange={(open) => {
        setIsDeleteBookConfirmOpen(open);
        if (!open) {
          setBookToDelete(null);
          setBookToDeleteName("");
          setDeleteBookConfirmationText("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Type the book name <strong>"{bookToDeleteName}"</strong> to confirm deletion.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deleteBookConfirmation">Book Name</Label>
              <Input
                id="deleteBookConfirmation"
                placeholder={`Type "${bookToDeleteName}" to confirm`}
                value={deleteBookConfirmationText}
                onChange={(e) => setDeleteBookConfirmationText(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              className="bg-gray-100 hover:bg-gray-200"
              onClick={() => {
                setIsDeleteBookConfirmOpen(false);
                setBookToDelete(null);
                setBookToDeleteName("");
                setDeleteBookConfirmationText("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteBook}
              disabled={deleteBookConfirmationText.trim() !== bookToDeleteName.trim() || isDeletingBook}
            >
              {isDeletingBook ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Book Dialog */}
      <Dialog open={isBookDialogOpen} onOpenChange={(open) => {
        setIsBookDialogOpen(open);
        if (!open) {
          // Reset form when closing dialog
          setNewBookName("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Book</DialogTitle>
            <DialogDescription>
              Create a new book to organize your transactions separately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bookName">Book Name</Label>
              <Input
                id="bookName"
                placeholder="Enter book name"
                value={newBookName}
                maxLength={30}
                onChange={(e) => {
                  const value = e.target.value;
                  // Prevent entering more than 30 characters
                  if (value.length > 30) {
                    toast.error('Book name cannot exceed 30 characters');
                    return;
                  }
                  setNewBookName(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBook();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              className="bg-gray-100 hover:bg-gray-200" 
              onClick={() => {
                setIsBookDialogOpen(false);
                setNewBookName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBook} disabled={isCreatingBook}>
              {isCreatingBook ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                  Creating...
                </>
              ) : (
                'Create Book'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Modal */}
      <Dialog open={isActivityModalOpen} onOpenChange={(open) => {
        setIsActivityModalOpen(open);
        if (open) {
          fetchActivities();
        }
      }}>
        <DialogContent 
          className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden"
          onWheel={(e) => {
            e.stopPropagation();
          }}
          onScroll={(e) => {
            e.stopPropagation();
          }}
        >
          <DialogHeader>
            <DialogTitle>Activity Log</DialogTitle>
            <DialogDescription className="sr-only">View all activities for this book</DialogDescription>
          </DialogHeader>
          
          <div 
            className="space-y-4 py-4 px-0"
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onScroll={(e) => {
              e.stopPropagation();
              // Prevent scroll from propagating to background
              const target = e.currentTarget;
              const scrollTop = target.scrollTop;
              const scrollHeight = target.scrollHeight;
              const clientHeight = target.clientHeight;
              
              // If at boundaries, prevent further scroll
              if (scrollTop <= 0 || scrollTop + clientHeight >= scrollHeight) {
                e.stopPropagation();
              }
            }}
          >
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : activities.length === 0 ? (
              <Card className="border border-border">
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No activities yet. Activities will appear here as actions are performed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 w-full">
                {activities.map((activity) => {
                  const activityDate = new Date(activity.created_at);
                  const dateTimeString = formatDateTime(activityDate);
                  
                  // Get activity icon and color based on type
                  const getActivityIcon = () => {
                    if (activity.activity_type.includes('transaction')) {
                      return activity.activity_type.includes('created') ? ArrowUpCircle : 
                             activity.activity_type.includes('updated') ? Pencil : Trash2;
                    } else if (activity.activity_type.includes('member')) {
                      return Users;
                    } else if (activity.activity_type.includes('party')) {
                      return User;
                    } else if (activity.activity_type.includes('book')) {
                      return Wallet;
                    }
                    return Activity;
                  };
                  
                  const Icon = getActivityIcon();
                  
                  // Get background and icon colors based on activity type
                  const getActivityColors = () => {
                    if (activity.activity_type.includes('transaction')) {
                      return {
                        bg: 'bg-green-50 dark:bg-green-950/20',
                        border: 'border-green-500',
                        icon: 'text-green-600 dark:text-green-400'
                      };
                    } else if (activity.activity_type.includes('member')) {
                      return {
                        bg: 'bg-blue-50 dark:bg-blue-950/20',
                        border: 'border-blue-500',
                        icon: 'text-blue-600 dark:text-blue-400'
                      };
                    } else if (activity.activity_type.includes('party')) {
                      return {
                        bg: 'bg-purple-50 dark:bg-purple-950/20',
                        border: 'border-purple-500',
                        icon: 'text-purple-600 dark:text-purple-400'
                      };
                    } else if (activity.activity_type.includes('book')) {
                      return {
                        bg: 'bg-amber-50 dark:bg-amber-950/20',
                        border: 'border-amber-500',
                        icon: 'text-amber-600 dark:text-amber-400'
                      };
                    }
                    return {
                      bg: 'bg-gray-50 dark:bg-gray-950/20',
                      border: 'border-gray-500',
                      icon: 'text-gray-600 dark:text-gray-400'
                    };
                  };
                  
                  const colors = getActivityColors();
                  
                  return (
                    <Card key={activity.id} className="border border-border w-full">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${colors.bg} ${colors.border}`}>
                            <Icon className={`h-4 w-4 ${colors.icon}`} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground mb-1">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-nowrap">
                              <span className="font-medium text-foreground/80 whitespace-nowrap">{formatUserName(activity.user_name, activity.user_email)}</span>
                              <span className="text-muted-foreground/50 flex-shrink-0">•</span>
                              <span className="text-muted-foreground whitespace-nowrap">{dateTimeString}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={isMembersModalOpen} onOpenChange={(open) => {
        setIsMembersModalOpen(open);
        // Close member menu when modal closes
        if (!open) {
          setOpenMemberMenu(null);
        }
      }}>
        <DialogContent 
          className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Book Members</DialogTitle>
            <DialogDescription className="sr-only">Manage who has access to this book</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Manage who has access to "{selectedBook?.name || "this book"}"
              </p>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Current Members</h3>
                {membersLoading ? (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    Loading...
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{bookMembers.length} {bookMembers.length === 1 ? 'member' : 'members'}</span>
                )}
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : bookMembers.length === 0 ? (
                <Card className="border border-border">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No members yet. Add members to share this book.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border">
                  <CardContent className="p-0 overflow-x-hidden">
                    {bookMembers.map((member, index) => {
                      const isCurrentUser = member.email === profileData.email;
                      const roleColors: Record<string, string> = {
                        owner: "bg-purple-50 dark:bg-purple-950/30 border border-purple-500 text-purple-700 dark:text-purple-400",
                        admin: "bg-blue-50 dark:bg-blue-950/30 border border-blue-500 text-blue-700 dark:text-blue-400",
                        editor: "bg-green-50 dark:bg-green-950/30 border border-green-500 text-green-700 dark:text-green-400",
                        viewer: "bg-amber-50 dark:bg-amber-950/30 border border-amber-500 text-amber-700 dark:text-amber-400",
                      };
                      
                      // Check if current user is the only owner
                      const ownerCount = bookMembers.filter(m => m.role === 'owner').length;
                      const isOnlyOwner = isCurrentUser && member.role === 'owner' && ownerCount === 1;
                      
                      return (
                        <div key={member.email} className="p-4 border-b border-border last:border-b-0 relative">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`h-12 w-12 rounded-full bg-gradient-to-r ${getGradientFromEmail(member.email)} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-sm font-semibold text-white">
                                  {getInitials(member.name || member.email)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-foreground truncate">{member.name || member.email.split('@')[0]}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[member.role] || roleColors.viewer} font-medium`}>
                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                              </div>
                            </div>
                            {(() => {
                              // Show menu for:
                              // 1. Other members (if current user is owner/admin)
                              // 2. Current user themselves (to allow self-management)
                              // BUT: Hide menu if current user is the only owner (to prevent leaving without owner)
                              
                              if (isOnlyOwner) return null; // Don't show menu for only owner
                              
                              if (isCurrentUser) {
                                // Current user managing themselves
                                // Viewers cannot change their role, so hide the option
                                const currentUserRole = member.role;
                                const canChangeOwnRole = currentUserRole !== 'viewer';
                                
                                return (
                                  <div className="relative flex-shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      data-member-menu-button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMemberMenu(openMemberMenu === member.email ? null : member.email);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                    {openMemberMenu === member.email && (
                                      <div 
                                        data-member-menu
                                        className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[140px] overflow-visible"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        {canChangeOwnRole && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenMemberMenu(null);
                                              setEditingMemberEmail(member.email);
                                              setEditingMemberName(member.name || member.email.split('@')[0]);
                                              setSelectedRole(member.role as "owner" | "admin" | "editor" | "viewer");
                                              setIsEditRoleModalOpen(true);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-t-lg text-foreground font-normal"
                                          >
                                            <Pencil className="h-4 w-4" />
                                            Edit Role
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMemberMenu(null);
                                            setMemberToDelete(member.email);
                                            setIsDeleteMemberConfirmOpen(true);
                                          }}
                                          className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 ${canChangeOwnRole ? 'rounded-b-lg' : 'rounded-lg'} text-red-600`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Leave
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                // Managing other members
                                const currentUserRole = bookRoles[selectedBookId || 0];
                                const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
                                const canEditRole = currentUserRole === 'owner';
                                const canEditOwner = canEditRole; // Only owners can edit owners
                                const canEditThisMember = member.role === 'owner' ? canEditOwner : canEditRole;
                                
                                if (!canManageMembers) return null;
                                
                                return (
                                  <div className="relative flex-shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      data-member-menu-button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMemberMenu(openMemberMenu === member.email ? null : member.email);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                    {openMemberMenu === member.email && (
                                      <div 
                                        data-member-menu
                                        className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[140px] overflow-visible"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        {canEditThisMember && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenMemberMenu(null);
                                              setEditingMemberEmail(member.email);
                                              setEditingMemberName(member.name || member.email.split('@')[0]);
                                              setSelectedRole(member.role as "owner" | "admin" | "editor" | "viewer");
                                              setIsEditRoleModalOpen(true);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 rounded-t-lg text-foreground font-normal"
                                          >
                                            <Pencil className="h-4 w-4" />
                                            Edit Role
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMemberMenu(null);
                                            setMemberToDelete(member.email);
                                            setIsDeleteMemberConfirmOpen(true);
                                          }}
                                          className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 ${canEditThisMember ? 'rounded-b-lg' : 'rounded-lg'} text-red-600`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Remove
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Add Member Button at Bottom - Only show for owners and admins */}
            {(() => {
              const currentUserRole = bookRoles[selectedBookId || 0];
              const canAddMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
              
              if (!canAddMembers) return null;
              
              return (
                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={(open) => {
        setIsAddMemberModalOpen(open);
        if (!open) {
          setSelectedRole("viewer");
        }
      }}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription className="sr-only">Add a new member to this book by email</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newMemberEmail" className="text-foreground text-xs font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground stroke-current pointer-events-none" strokeWidth={2} />
                <Input
                  id="newMemberEmail"
                  type="email"
                  placeholder="Enter email address"
                  className="pl-10"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-foreground">Select Role</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSelectedRole("owner")}
                  className={`p-2 rounded-lg border-2 transition-all text-center ${
                    selectedRole === "owner"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
                      : "border-border hover:border-purple-300 text-purple-600 dark:text-purple-400"
                  }`}
                >
                  <div className="font-semibold text-xs">Owner</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("admin")}
                  className={`p-2 rounded-lg border-2 transition-all text-center ${
                    selectedRole === "admin"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                      : "border-border hover:border-blue-300 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <div className="font-semibold text-xs">Admin</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("editor")}
                  className={`p-2 rounded-lg border-2 transition-all text-center ${
                    selectedRole === "editor"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                      : "border-border hover:border-green-300 text-green-600 dark:text-green-400"
                  }`}
                >
                  <div className="font-semibold text-xs">Editor</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("viewer")}
                  className={`p-2 rounded-lg border-2 transition-all text-center ${
                    selectedRole === "viewer"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                      : "border-border hover:border-amber-300 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <div className="font-semibold text-xs">Viewer</div>
                </button>
              </div>

              {/* Permissions Display */}
              {selectedRole && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                  <div className="font-medium text-sm">Permissions for {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}:</div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Add transactions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Edit transactions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Delete transactions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Manage members</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Manage books</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm">View transactions</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAddMemberModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              onClick={async () => {
                if (!newMemberEmail.trim()) {
                  toast.error("Please enter an email address");
                  return;
                }
                await addBookMember(newMemberEmail.trim(), selectedRole);
              }}
              disabled={!newMemberEmail.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={isEditRoleModalOpen} onOpenChange={(open) => {
        setIsEditRoleModalOpen(open);
        if (!open) {
          setEditingMemberEmail("");
          setEditingMemberName("");
          setSelectedRole("viewer");
          setIsLastOwner(false);
        }
      }}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription className="sr-only">Change role for {editingMemberName || editingMemberEmail}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Member</p>
              <p className="font-medium">{editingMemberName || editingMemberEmail}</p>
              <p className="text-sm text-muted-foreground">{editingMemberEmail}</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-foreground">Select Role</Label>
              {(() => {
                // Check if this is a self-change
                const isSelfChange = editingMemberEmail === user?.email;
                // Get current member's role
                const currentMember = bookMembers.find(m => m.email === editingMemberEmail);
                const currentMemberRole = currentMember?.role || selectedRole;
                
                // Role hierarchy: Owner (4) > Admin (3) > Editor (2) > Viewer (1)
                const roleHierarchy: Record<string, number> = {
                  owner: 4,
                  admin: 3,
                  editor: 2,
                  viewer: 1
                };
                
                const currentRoleLevel = roleHierarchy[currentMemberRole] || 1;
                
                // For self-change, disable roles superior to current role
                const isOwnerDisabled = isSelfChange && roleHierarchy.owner > currentRoleLevel;
                const isAdminDisabled = isSelfChange && roleHierarchy.admin > currentRoleLevel;
                const isEditorDisabled = isSelfChange && roleHierarchy.editor > currentRoleLevel;
                const isViewerDisabled = isSelfChange && roleHierarchy.viewer > currentRoleLevel;
                
                return (
                  <>
                    {isLastOwner && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          ⚠️ This is the last owner. You cannot change their role to a non-owner role. There must be at least one owner.
                        </p>
                      </div>
                    )}
                    {isSelfChange && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          ℹ️ You can only change your role to your current role or a lower role. You cannot promote yourself.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (isLastOwner) {
                            toast.error("Cannot change the last owner's role");
                            return;
                          }
                          if (isOwnerDisabled) {
                            toast.error("You cannot promote yourself to a higher role");
                            return;
                          }
                          setSelectedRole("owner");
                        }}
                        disabled={isLastOwner || isOwnerDisabled}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          selectedRole === "owner"
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
                            : (isLastOwner || isOwnerDisabled)
                            ? "border-border opacity-50 cursor-not-allowed text-muted-foreground"
                            : "border-border hover:border-purple-300 text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        <div className="font-semibold text-xs">Owner</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isLastOwner) {
                            toast.error("Cannot change the last owner's role");
                            return;
                          }
                          if (isAdminDisabled) {
                            toast.error("You cannot promote yourself to a higher role");
                            return;
                          }
                          setSelectedRole("admin");
                        }}
                        disabled={isLastOwner || isAdminDisabled}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          selectedRole === "admin"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                            : (isLastOwner || isAdminDisabled)
                            ? "border-border opacity-50 cursor-not-allowed text-muted-foreground"
                            : "border-border hover:border-blue-300 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        <div className="font-semibold text-xs">Admin</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isLastOwner) {
                            toast.error("Cannot change the last owner's role");
                            return;
                          }
                          if (isEditorDisabled) {
                            toast.error("You cannot promote yourself to a higher role");
                            return;
                          }
                          setSelectedRole("editor");
                        }}
                        disabled={isLastOwner || isEditorDisabled}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          selectedRole === "editor"
                            ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                            : (isLastOwner || isEditorDisabled)
                            ? "border-border opacity-50 cursor-not-allowed text-muted-foreground"
                            : "border-border hover:border-green-300 text-green-600 dark:text-green-400"
                        }`}
                      >
                        <div className="font-semibold text-xs">Editor</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isLastOwner) {
                            toast.error("Cannot change the last owner's role");
                            return;
                          }
                          if (isViewerDisabled) {
                            toast.error("You cannot promote yourself to a higher role");
                            return;
                          }
                          setSelectedRole("viewer");
                        }}
                        disabled={isLastOwner || isViewerDisabled}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          selectedRole === "viewer"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                            : (isLastOwner || isViewerDisabled)
                            ? "border-border opacity-50 cursor-not-allowed text-muted-foreground"
                            : "border-border hover:border-amber-300 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <div className="font-semibold text-xs">Viewer</div>
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* Permissions Display */}
              {selectedRole && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                  <div className="font-medium text-sm">Permissions for {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}:</div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Add transactions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" || selectedRole === "editor" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Edit transactions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Delete transactions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" || selectedRole === "admin" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" || selectedRole === "admin" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Manage members</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={selectedRole === "owner" ? "text-green-600" : "text-red-600"}>
                        {selectedRole === "owner" ? "✓" : "✗"}
                      </span>
                      <span className="text-sm">Manage books</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm">View transactions</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditRoleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              onClick={async () => {
                if (!editingMemberEmail) return;
                await updateMemberRole(editingMemberEmail, selectedRole);
              }}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <Dialog open={isDeleteMemberConfirmOpen} onOpenChange={(open) => {
        setIsDeleteMemberConfirmOpen(open);
        if (!open) {
          setMemberToDelete("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{memberToDelete === profileData.email ? "Leave Book" : "Remove Member"}</DialogTitle>
            <DialogDescription>
              {memberToDelete === profileData.email 
                ? "Are you sure you want to leave this book? You will lose access to all transactions in this book."
                : "Are you sure you want to remove this member from the book? They will lose access to all transactions in this book."}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteMemberConfirmOpen(false);
                setMemberToDelete("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="bg-red-500 hover:bg-red-600"
              onClick={async () => {
                if (memberToDelete) {
                  await removeBookMember(memberToDelete);
                }
              }}
            >
              {memberToDelete === profileData.email ? "Leave" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation Bar - Only show for owner, admin, and editor, and only if books exist */}
      {books.length > 0 && (() => {
        const currentUserRole = bookRoles[selectedBookId || 0];
        const canAddTransaction = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'editor';
        
        if (!canAddTransaction) return null;
        
        return (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom" style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}>
            <div className="container mx-auto max-w-2xl">
              <div className="flex items-center justify-center gap-4 px-4 py-3">
                {/* Income Button */}
                <Button
                  onClick={() => {
                    setTransactionType("income");
                    setIsDialogOpen(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <ArrowUpCircle className="h-5 w-5" />
                  <span>Income</span>
                </Button>

                {/* Expense Button */}
                <Button
                  onClick={() => {
                    setTransactionType("expense");
                    setIsDialogOpen(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <ArrowDownCircle className="h-5 w-5" />
                  <span>Expense</span>
                </Button>
              </div>
            </div>
          </nav>
        );
      })()}
    </div>
  );
}
