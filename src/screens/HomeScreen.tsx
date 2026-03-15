import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext";
import {
  getExpenses,
  createExpense,
  deleteExpense,
  getCategories,
} from "../api/client";

interface Expense {
  id: number;
  title: string;
  amount: string;
  date: string;
  note: string;
  category: number | null;
  category_name: string;
}

interface Category {
  id: number;
  name: string;
}

const COLORS = [
  "#6C63FF",
  "#FF6584",
  "#43C6AC",
  "#FFD93D",
  "#FF9A3C",
  "#4D96FF",
];

export default function HomeScreen() {
  const { logout } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesData, categoriesData] = await Promise.all([
        getExpenses(),
        getCategories(),
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (e) {
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !amount) {
      Alert.alert("Error", "Please fill in title and amount");
      return;
    }
    try {
      await createExpense({
        title,
        amount,
        date: date.toISOString().split("T")[0],
        note,
        category: categoryId ?? undefined,
      });
      setTitle("");
      setAmount("");
      setNote("");
      setCategoryId(null);
      setDate(new Date());
      setModalVisible(false);
      fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to create expense");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteExpense(id);
          fetchData();
        },
      },
    ]);
  };

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const chartData = expenses.reduce((acc: any[], e) => {
    const name = e.category_name || "Other";
    const existing = acc.find((item) => item.name === name);
    if (existing) {
      existing.population += parseFloat(e.amount);
    } else {
      acc.push({
        name,
        population: parseFloat(e.amount),
        color: COLORS[acc.length % COLORS.length],
        legendFontColor: "#666",
        legendFontSize: 12,
      });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size={36} color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Expenses</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Expenses by Category</Text>
            <PieChart
              data={chartData}
              width={Dimensions.get("window").width - 32}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="16"
            />
          </View>
        )}

        {/* List */}
        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Recent Expenses</Text>
          {expenses.length === 0 ? (
            <Text style={styles.empty}>No expenses yet. Add your first!</Text>
          ) : (
            expenses.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.expenseItem}
                onLongPress={() => handleDelete(item.id)}
              >
                <View>
                  <Text style={styles.expenseTitle}>{item.title}</Text>
                  <Text style={styles.expenseDate}>
                    {item.category_name || "Uncategorized"} • {item.date}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>${item.amount}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Expense</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            
            {/* Date Picker */}
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ fontSize: 16, color: "#1A1A2E" }}>
                📅 {date.toISOString().split("T")[0]}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Note (optional)"
              value={note}
              onChangeText={setNote}
            />
            {/* Category Picker */}
            <Text style={styles.categoryLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  categoryId === null && styles.categoryChipActive,
                ]}
                onPress={() => setCategoryId(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryId === null && styles.categoryChipTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    categoryId === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      categoryId === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.button} onPress={handleCreate}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 56,
    backgroundColor: "#6C63FF",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  logout: { color: "#FFF", fontSize: 14 },
  totalCard: {
    margin: 16,
    padding: 24,
    backgroundColor: "#FFF",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: { fontSize: 14, color: "#666", marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: "bold", color: "#1A1A2E" },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  listCard: {
    marginHorizontal: 16,
    marginBottom: 80,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 12,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  expenseTitle: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  expenseDate: { fontSize: 12, color: "#999", marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "bold", color: "#6C63FF" },
  empty: { textAlign: "center", color: "#999", paddingVertical: 32 },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    backgroundColor: "#6C63FF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#FFF", fontSize: 28, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1A1A2E",
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryLabel: { fontSize: 14, color: "#666", marginBottom: 8 },
  categoryScroll: { marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  categoryChipActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  categoryChipText: { fontSize: 14, color: "#666" },
  categoryChipTextActive: { color: "#FFF" },
  button: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  cancel: { textAlign: "center", color: "#999", fontSize: 14 },
});
