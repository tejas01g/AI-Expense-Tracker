import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const weeklyData = [
  { day: 'Mon', value: 40 },
  { day: 'Tue', value: 65 },
  { day: 'Wed', value: 30 },
  { day: 'Thu', value: 80 },
  { day: 'Fri', value: 55 },
  { day: 'Sat', value: 100 },
  { day: 'Sun', value: 50 },
];

const expenses = [
  {
    id: '1',
    title: 'Shopping',
    amount: '$320',
  },
  {
    id: '2',
    title: 'Food',
    amount: '$180',
  },
  {
    id: '3',
    title: 'Transport',
    amount: '$90',
  },
];

const HomeScreen = () => {
  const sections = ['content'];

  const renderContent = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back 👋</Text>
          <Text style={styles.greeting}>Good Evening</Text>
        </View>

        <View style={styles.profile} />
      </View>

      {/* AI Insight */}
      <LinearGradient
        colors={['#3B2A73', '#244A87']}
        style={styles.aiCard}
      >
        <Text style={styles.aiTitle}>AI Insight</Text>
        <Text style={styles.aiText}>
          Spent 18% more this week. Reduce shopping expenses.
        </Text>
      </LinearGradient>

      {/* Expense Card */}
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.08)']}
        style={styles.expenseCard}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>Your Expenses</Text>

          <TouchableOpacity style={styles.monthBtn}>
            <Text style={styles.monthText}>This Month</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.amount}>$5,000.50</Text>

        <Text style={styles.increase}>
          This Month <Text style={styles.green}>↑ 12%</Text>
        </Text>

        <View style={styles.progressBg}>
          <LinearGradient
            colors={['#9B4DFF', '#2CA7FF']}
            style={styles.progressFill}
          />
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.bottomText}>
            Budget : $8,000
          </Text>

          <Text style={styles.bottomText}>
            Remaining : $3,000
          </Text>
        </View>
      </LinearGradient>

      {/* Weekly Expenses */}
      <View style={styles.chartCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>
            Weekly Expenses
          </Text>

          <Text style={styles.smallAmount}>
            $1,197
          </Text>
        </View>

        <View style={styles.chartContainer}>
          {weeklyData.map(item => (
            <View
              key={item.day}
              style={styles.barContainer}
            >
              <LinearGradient
                colors={['#7B4CFF', '#31B6FF']}
                style={[
                  styles.bar,
                  {
                    height: item.value,
                  },
                ]}
              />

              <Text style={styles.day}>
                {item.day}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Expenses */}
      <View style={styles.topSection}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>
            Top Expenses
          </Text>

          <Text style={styles.seeAll}>
            See All
          </Text>
        </View>

        {expenses.map(item => (
          <View
            key={item.id}
            style={styles.expenseItem}
          >
            <Text style={styles.expenseTitle}>
              {item.title}
            </Text>

            <Text style={styles.expenseAmount}>
              {item.amount}
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={item => item}
        renderItem={renderContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101B46',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  welcome: {
    color: '#B7C0E0',
    fontSize: 14,
  },

  greeting: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },

  profile: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#24315F',
  },

  aiCard: {
    margin: 20,
    borderRadius: 18,
    padding: 16,
  },

  aiTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },

  aiText: {
    color: '#D4D9EF',
    lineHeight: 22,
  },

  expenseCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardLabel: {
    color: '#C8D0F0',
  },

  monthBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  monthText: {
    color: '#fff',
    fontSize: 12,
  },

  amount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
    marginTop: 12,
  },

  increase: {
    color: '#C8D0F0',
    marginTop: 10,
  },

  green: {
    color: '#4ADE80',
  },

  progressBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    marginVertical: 20,
    overflow: 'hidden',
  },

  progressFill: {
    width: '62%',
    height: '100%',
  },

  bottomText: {
    color: '#FFF',
    fontSize: 15,
  },

  chartCard: {
    backgroundColor: '#1A2757',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },

  smallAmount: {
    color: '#AEB9E0',
  },

  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    alignItems: 'flex-end',
  },

  barContainer: {
    alignItems: 'center',
  },

  bar: {
    width: 28,
    borderRadius: 14,
  },

  day: {
    color: '#AEB9E0',
    marginTop: 8,
    fontSize: 12,
  },

  topSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },

  seeAll: {
    color: '#2CA7FF',
  },

  expenseItem: {
    backgroundColor: '#1A2757',
    padding: 18,
    borderRadius: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  expenseTitle: {
    color: '#FFF',
    fontSize: 16,
  },

  expenseAmount: {
    color: '#FFF',
    fontWeight: '600',
  },
});
//gh