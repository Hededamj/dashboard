import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      status: "testing",
      tests: [] as any[],
      summary: {} as any,
    };

    const startTotal = Date.now();

    // Test 1: Connection Time
    console.log("Test 1: Testing connection...");
    const startConnection = Date.now();

    let connection;
    try {
      connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT || "3306"),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectTimeout: 10000,
      });

      const connectionTime = Date.now() - startConnection;
      results.tests.push({
        test: "Connection",
        time: connectionTime,
        status: "✅ Success",
      });
      console.log(`✅ Connection established in ${connectionTime}ms`);
    } catch (error: any) {
      const connectionTime = Date.now() - startConnection;
      results.tests.push({
        test: "Connection",
        time: connectionTime,
        status: "❌ Failed",
        error: error.message,
      });
      console.error(`❌ Connection failed:`, error.message);

      return NextResponse.json({
        ...results,
        status: "failed",
        summary: {
          totalTime: Date.now() - startTotal,
          verdict: "❌ Cannot connect to MySQL database",
          recommendation: "Check database credentials and firewall settings",
        },
      });
    }

    // Test 2: Simple Query
    console.log("Test 2: Testing simple query...");
    const startSimple = Date.now();
    try {
      await connection.execute("SELECT 1 as test");
      const simpleTime = Date.now() - startSimple;
      results.tests.push({
        test: "Simple Query (SELECT 1)",
        time: simpleTime,
        status: "✅ Success",
      });
      console.log(`✅ Simple query completed in ${simpleTime}ms`);
    } catch (error: any) {
      const simpleTime = Date.now() - startSimple;
      results.tests.push({
        test: "Simple Query",
        time: simpleTime,
        status: "❌ Failed",
        error: error.message,
      });
      console.error(`❌ Simple query failed:`, error.message);
    }

    // Test 3: Show Tables
    console.log("Test 3: Listing tables...");
    const startTables = Date.now();
    try {
      const [rows] = await connection.execute("SHOW TABLES");
      const tablesTime = Date.now() - startTables;
      results.tests.push({
        test: "Show Tables",
        time: tablesTime,
        status: "✅ Success",
        tablesFound: (rows as any[]).length,
      });
      console.log(`✅ Found ${(rows as any[]).length} tables in ${tablesTime}ms`);
    } catch (error: any) {
      const tablesTime = Date.now() - startTables;
      results.tests.push({
        test: "Show Tables",
        time: tablesTime,
        status: "❌ Failed",
        error: error.message,
      });
      console.error(`❌ Show tables failed:`, error.message);
    }

    // Test 4: Multiple Queries (simulate real usage)
    console.log("Test 4: Running 10 queries in sequence...");
    const startMultiple = Date.now();
    let multipleSuccess = 0;
    try {
      for (let i = 0; i < 10; i++) {
        await connection.execute("SELECT NOW(), ? as iteration", [i]);
        multipleSuccess++;
      }
      const multipleTime = Date.now() - startMultiple;
      const avgTime = multipleTime / 10;
      results.tests.push({
        test: "10 Sequential Queries",
        totalTime: multipleTime,
        avgTime: Math.round(avgTime),
        status: "✅ Success",
      });
      console.log(`✅ 10 queries completed in ${multipleTime}ms (avg: ${avgTime}ms per query)`);
    } catch (error: any) {
      const multipleTime = Date.now() - startMultiple;
      results.tests.push({
        test: "Multiple Queries",
        totalTime: multipleTime,
        successCount: multipleSuccess,
        status: "❌ Failed",
        error: error.message,
      });
      console.error(`❌ Multiple queries failed after ${multipleSuccess} queries:`, error.message);
    }

    // Close connection
    await connection.end();

    const totalTime = Date.now() - startTotal;

    // Calculate average latency
    const avgLatency = results.tests
      .filter(t => t.time)
      .reduce((sum, t) => sum + t.time, 0) / results.tests.filter(t => t.time).length;

    // Determine verdict
    let verdict = "";
    let recommendation = "";

    if (avgLatency < 50) {
      verdict = "🚀 EXCELLENT - MySQL is very fast!";
      recommendation = "This is perfect for production use. Go ahead and use MySQL!";
    } else if (avgLatency < 100) {
      verdict = "✅ GOOD - MySQL is fast enough";
      recommendation = "Acceptable performance. MySQL will work well for your dashboard.";
    } else if (avgLatency < 200) {
      verdict = "⚠️ ACCEPTABLE - MySQL is somewhat slow";
      recommendation = "Will work but consider Vercel Postgres for better performance.";
    } else {
      verdict = "❌ SLOW - MySQL has high latency";
      recommendation = "Use Vercel Postgres instead for much better performance.";
    }

    results.status = "completed";
    results.summary = {
      totalTime,
      avgLatency: Math.round(avgLatency),
      verdict,
      recommendation,
    };

    console.log("\n=== Test Summary ===");
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average latency: ${Math.round(avgLatency)}ms`);
    console.log(`Verdict: ${verdict}`);
    console.log("===================\n");

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("MySQL Speed Test Error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
