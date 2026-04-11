import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../constants/api";
import { useRouter } from "expo-router";

export default function BulkImport({ embedded = false, onClose = null } = {}) {
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const [csvData, setCsvData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [results, setResults] = useState(null);

  const createStyles = () => {
    const isWeb = Platform.OS === "web";
    const isSmall = viewportWidth < 500;
    const isTablet = viewportWidth >= 768;
    const horizontalPadding = isWeb ? 20 : isSmall ? 12 : 16;

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: embedded ? "transparent" : colors.background,
      },
      pageWrapper: {
        flexGrow: 1,
        width: "100%",
        maxWidth: isWeb ? 1200 : "100%",
        alignSelf: "center",
        paddingHorizontal: horizontalPadding,
        paddingBottom: 28,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        width: "100%", // Ensure header spans full width
      },
      content: {
        flex: 1,
        paddingVertical: isWeb ? 18 : 14,
      },
      embeddedContent: {
        flex: 1,
        paddingTop: 6,
      },
      backButton: {
        marginRight: 16,
        padding: 8,
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
      },

      instructionsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: isSmall ? 12 : 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
      },
      instructionsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 12,
      },
      instructionText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        lineHeight: 20,
      },
      exampleCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      },
      exampleText: {
        fontSize: 12,
        fontFamily: "monospace",
        color: colors.text,
      },
      inputCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: isSmall ? 12 : 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
      },
      inputTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 12,
      },
      filePickerContainer: {
        alignItems: "center",
        padding: isSmall ? 12 : 20,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: "dashed",
        borderRadius: 8,
        backgroundColor: colors.surface,
      },
      filePickerButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
      },
      filePickerButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      },
      selectedFileContainer: {
        marginTop: 10,
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
      },
      selectedFileText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "500",
      },
      selectedFileDetails: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
      },
      textArea: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        color: colors.text,
        fontSize: 14,
        minHeight: 200,
        textAlignVertical: "top",
        fontFamily: "monospace",
      },
      buttonContainer: {
        flexDirection: isTablet ? "row" : "column",
        justifyContent: "flex-start",
        marginBottom: 20,
        flexWrap: isTablet ? "wrap" : "nowrap",
      },
      button: {
        flex: isTablet ? 1 : 0,
        minWidth: isTablet ? 220 : undefined,
        width: isTablet ? "auto" : "100%",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: isTablet ? 4 : 0,
        marginVertical: 6,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
      },
      primaryButton: {
        backgroundColor: colors.primary,
      },
      secondaryButton: {
        backgroundColor: colors.accent,
      },
      sampleButton: {
        backgroundColor: colors.accent,
      },
      downloadButton: {
        backgroundColor: colors.accent,
      },
      clearButton: {
        backgroundColor: colors.error,
      },
      buttonText: {
        color: "#000000", // Changed from "#FFFFFF" to black
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      },
      buttonTextWhite: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      },
      buttonTextclear: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      },
      disabledButton: {
        backgroundColor: colors.border,
        opacity: 0.6,
      },
      resultsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      resultsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 12,
      },
      resultSection: {
        marginBottom: 16,
      },
      resultSectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
      },
      successTitle: {
        color: colors.success || "#4CAF50",
      },
      errorTitle: {
        color: colors.error || "#F44336",
      },
      warningTitle: {
        color: colors.warning || "#FF9800",
      },
      resultItem: {
        fontSize: 12,
        marginBottom: 4,
        paddingLeft: 8,
      },
      resultText: {
        color: colors.textSecondary,
      },
      processingCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
      },
      processingText: {
        color: colors.text,
        fontSize: 16,
        marginTop: 12,
        textAlign: "center",
      },
      accessDenied: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      },
      accessDeniedTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
      },
      accessDeniedText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
      },
      backButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
      },
    });
  };

  const styles = useMemo(createStyles, [colors, embedded, viewportWidth]);

  // Check admin access
  if (user?.privilege !== "admin") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.accessDenied}>
          <MaterialCommunityIcons
            name="shield-alert"
            size={64}
            color={colors.error}
          />
          <Text style={[styles.accessDeniedTitle, { color: colors.error }]}>
            Access Denied
          </Text>
          <Text
            style={[styles.accessDeniedText, { color: colors.textSecondary }]}
          >
            This feature is restricted to administrators only.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (embedded && typeof onClose === "function") {
                onClose();
                return;
              }
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const parseCsvText = (text) => {
    try {
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["username", "email", "password"]; // section removed

      for (const required of requiredHeaders) {
        if (!headers.includes(required)) {
          throw new Error(`Missing required column: ${required}`);
        }
      }

      const data = [];
      const validationErrors = [];
      const duplicateCheck = new Set();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length !== headers.length) {
          validationErrors.push(`Row ${i + 1}: Incorrect number of columns`);
          continue;
        }

        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        // Validate required fields
        if (!rowData.username || !rowData.email || !rowData.password) {
          validationErrors.push(
            `Row ${i + 1}: Missing required fields (username, email, password)`
          );
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rowData.email)) {
          validationErrors.push(`Row ${i + 1}: Invalid email format`);
          continue;
        }

        // Check for duplicates within the CSV
        const uniqueKey = `${rowData.username.toLowerCase()}-${rowData.email.toLowerCase()}`;
        if (duplicateCheck.has(uniqueKey)) {
          validationErrors.push(
            `Row ${i + 1}: Duplicate user in CSV (username: ${
              rowData.username
            }, email: ${rowData.email})`
          );
          continue;
        }
        duplicateCheck.add(uniqueKey);

        // Validate password length
        if (rowData.password.length < 6) {
          validationErrors.push(
            `Row ${i + 1}: Password must be at least 6 characters`
          );
          continue;
        }

        // Validate role if provided
        if (
          rowData.role &&
          !["admin", "instructor", "student"].includes(
            rowData.role.toLowerCase()
          )
        ) {
          validationErrors.push(
            `Row ${i + 1}: Invalid role. Must be admin, instructor, or student`
          );
          continue;
        }

        // Normalize data
        rowData.username = rowData.username.toLowerCase().trim();
        rowData.email = rowData.email.toLowerCase().trim();
        rowData.role = (rowData.role || "student").toLowerCase();
        rowData.fullName =
          rowData.fullname || rowData.fullName || rowData.username;
        // section column removed

        data.push(rowData);
      }

      if (validationErrors.length > 0) {
        throw new Error(
          `Validation errors found:\n${validationErrors.join("\n")}`
        );
      }

      return data;
    } catch (error) {
      throw new Error(`CSV parsing error: ${error.message}`);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);

        let fileContent;

        // Handle file reading differently for web vs mobile
        if (Platform.OS === "web") {
          // On web, file.uri is a blob URL, we need to fetch it
          const response = await fetch(file.uri);
          fileContent = await response.text();
        } else {
          // On mobile, use FileSystem as usual
          fileContent = await FileSystem.readAsStringAsync(file.uri);
        }

        // Parse the CSV content
        const parsedData = parseCsvText(fileContent);
        setCsvData(parsedData);

        Alert.alert(
          "File Selected",
          `Selected: ${file.name}\nFound ${parsedData.length} users to import`
        );
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert(
        "Error",
        "Failed to read the CSV file. Please make sure it's a valid CSV format."
      );
    }
  };

  const validateAndProcessData = (data) => {
    if (!data || data.length === 0) {
      throw new Error("No valid data to process");
    }

    setProcessingStep("Validating user data...");

    // Additional validation for business rules
    const processedData = data.map((row, index) => {
      const processed = { ...row };

      // Ensure all required fields are present and valid
      if (!processed.username || processed.username.length < 3) {
        throw new Error(
          `Row ${index + 2}: Username must be at least 3 characters`
        );
      }

      if (!processed.email || !processed.email.includes("@")) {
        throw new Error(`Row ${index + 2}: Invalid email format`);
      }

      if (!processed.password || processed.password.length < 6) {
        throw new Error(
          `Row ${index + 2}: Password must be at least 6 characters`
        );
      }

      return processed;
    });

    setProcessingStep("Data validation complete");
    return processedData;
  };

  const handleImport = async () => {
    if (!csvData || csvData.length === 0) {
      Alert.alert("Error", "Please select a CSV file first");
      return;
    }

    try {
      setImporting(true);
      setResults(null);
      setProcessingStep("Preparing data...");

      // Frontend preprocessing and validation
      console.log("Preprocessing CSV data...");
      const processedData = validateAndProcessData(csvData);

      setProcessingStep(`Sending ${processedData.length} users to server...`);
      console.log(
        `Sending ${processedData.length} validated users to backend...`
      );
      console.log("API_URL:", API_URL);
      console.log("Token present:", !!token);
      console.log("Platform:", Platform.OS);

      // Send to backend for processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      console.log("Making fetch request...");

      // Add a test to see if we can reach the server first
      try {
        console.log("Testing server connectivity...");
        const testResponse = await fetch(`${API_URL}/auth/health`, {
          method: "GET",
          signal: AbortSignal.timeout(5000), // 5 second timeout for health check
        });
        console.log(
          "Server health check:",
          testResponse.ok ? "✅ OK" : "❌ Failed"
        );
      } catch (healthError) {
        console.warn("Server health check failed:", healthError.message);
        // Continue anyway, as the health endpoint might not exist
      }

      const response = await fetch(`${API_URL}/admin/users/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          csvData: processedData,
          preprocessed: true, // Flag to indicate data is already validated
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setProcessingStep("Processing server response...");

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Check if the response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        setResults(data.results);
        setProcessingStep("Import completed successfully!");
        Alert.alert("Import Complete", data.message);
      } else {
        throw new Error(data.message || "Import failed");
      }
    } catch (_error) {
      console.error("Import error:", _error);
      setProcessingStep("Import failed");

      let errorMessage = _error.message;
      if (_error.name === "AbortError") {
        errorMessage =
          "Request timed out. Please try again with a smaller file.";
      } else if (
        _error.message.includes("NetworkError") ||
        _error.message.includes("fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (_error.message.includes("Failed to fetch")) {
        errorMessage =
          "Network error: Could not connect to server. Please check if the backend is running and the API URL is correct.";
      }

      Alert.alert("Import Error", errorMessage);
    } finally {
      console.log("Import process finished, resetting state...");
      setImporting(false);
      setTimeout(() => setProcessingStep(""), 3000); // Clear processing step after 3 seconds
    }
  };

  const handleClear = () => {
    setCsvData(null);
    setSelectedFile(null);
    setResults(null);
  };

  const isImportEnabled = !importing && !!csvData && csvData.length > 0;

  const loadSampleData = () => {
    const sampleCsv = `username,email,password,role,fullName
student6,student6@example.com,password123,student,Student Six
student7,student7@example.com,password123,student,Student Seven
instructor2,instructor2@example.com,instructor123,instructor,Instructor Two`;

    try {
      const parsedData = parseCsvText(sampleCsv);
      setCsvData(parsedData);
      setSelectedFile({ name: "sample-data.csv", size: sampleCsv.length });
      Alert.alert(
        "Sample Data Loaded",
        `Loaded ${parsedData.length} sample users`
      );
    } catch (_error) {
      Alert.alert("Error", "Failed to load sample data");
    }
  };

  const downloadSampleCsv = async () => {
    const sampleCsv = `username,email,password,role,fullName\nstudent6,student6@example.com,password123,student,Student Six\nstudent7,student7@example.com,password123,student,Student Seven\ninstructor2,instructor2@example.com,instructor123,instructor,Instructor Two`;
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([sampleCsv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sample-data.csv";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        Alert.alert("Download Started", "Sample CSV download initiated.");
      } else {
        const fileUri = `${FileSystem.cacheDirectory}sample-data.csv`;
        await FileSystem.writeAsStringAsync(fileUri, sampleCsv, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Save or share sample-data.csv",
            UTI: "public.comma-separated-values-text",
          });
          Alert.alert(
            "Sample Ready",
            "Choose where to save the sample CSV from the share options."
          );
        } else {
          Alert.alert("File Saved", "Sample CSV created: sample-data.csv");
        }
      }
    } catch (e) {
      console.error("Failed to create sample CSV", e);
      Alert.alert("Error", "Failed to generate sample CSV file.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bulk User Import</Text>
        </View>
      )}

      <ScrollView
        style={[styles.content, embedded && styles.embeddedContent]}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.pageWrapper}
      >
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <Text style={styles.instructionText}>
            1. Prepare your CSV file with the required columns: username, email,
            password
          </Text>
          <Text style={styles.instructionText}>
            2. Optional columns: role (defaults to &quot;student&quot;),
            fullName, profileImage
          </Text>
          <Text style={styles.instructionText}>
            3. Upload your CSV file using the file picker below
          </Text>
          <Text style={styles.instructionText}>
            4. Click &quot;Import Users&quot; to process the data
          </Text>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleText}>
              Example CSV format:{"\n"}
              username,email,password,role,fullName{"\n"}
              student1,student1@example.com,password123,student,Student One
              {"\n"}
              instructor1,instructor1@example.com,instructor123,instructor,Instructor
              One
            </Text>
          </View>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputTitle}>CSV File Upload</Text>
          <View style={styles.filePickerContainer}>
            <TouchableOpacity
              style={styles.filePickerButton}
              onPress={pickDocument}
              disabled={importing}
            >
              <MaterialCommunityIcons
                name="file-upload"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.filePickerButtonText}>
                {selectedFile ? "Change CSV File" : "Select CSV File"}
              </Text>
            </TouchableOpacity>

            {selectedFile ? (
              <View style={styles.selectedFileContainer}>
                <Text style={styles.selectedFileText}>
                  📄 {selectedFile.name}
                </Text>
                <Text style={styles.selectedFileDetails}>
                  {csvData
                    ? `${csvData.length} users ready to import`
                    : "Processing..."}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.instructionText,
                  { textAlign: "center", marginTop: 10 },
                ]}
              >
                No file selected. Please choose a CSV file to upload.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.sampleButton]}
            onPress={loadSampleData}
            disabled={importing}
          >
            <MaterialCommunityIcons
              name="file-document"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.buttonTextWhite}>Load Sample</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.downloadButton]}
            onPress={downloadSampleCsv}
            disabled={importing}
          >
            <MaterialCommunityIcons
              name="download"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.buttonTextWhite}>Download Sample</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
            disabled={importing}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#FFFFFF" />
            <Text style={styles.buttonTextclear}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isImportEnabled ? styles.primaryButton : styles.disabledButton,
            ]}
            onPress={handleImport}
            disabled={!isImportEnabled}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons
                name="upload"
                size={20}
                color={isImportEnabled ? "#FFFFFF" : "#000000"}
              />
            )}
            <Text style={isImportEnabled ? styles.buttonTextWhite : styles.buttonText}>
              {importing ? "Importing..." : "Import Users"}
            </Text>
          </TouchableOpacity>
        </View>

        {importing && processingStep && (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>{processingStep}</Text>
          </View>
        )}

        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Import Results</Text>

            {results.success && results.success.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, styles.successTitle]}>
                  Successfully Created ({results.success.length})
                </Text>
                {results.success.map((user, index) => (
                  <Text
                    key={index}
                    style={[styles.resultItem, styles.resultText]}
                  >
                    • {user.username} ({user.email}) - {user.role}
                  </Text>
                ))}
              </View>
            )}

            {results.skipped && results.skipped.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, styles.warningTitle]}>
                  Skipped ({results.skipped.length})
                </Text>
                {results.skipped.map((user, index) => (
                  <Text
                    key={index}
                    style={[styles.resultItem, styles.resultText]}
                  >
                    • {user.username} ({user.email}) - {user.reason}
                  </Text>
                ))}
              </View>
            )}

            {results.errors && results.errors.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, styles.errorTitle]}>
                  Errors ({results.errors.length})
                </Text>
                {results.errors.map((error, index) => (
                  <Text
                    key={index}
                    style={[styles.resultItem, styles.resultText]}
                  >
                    • Row {index + 2}: {error.error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
