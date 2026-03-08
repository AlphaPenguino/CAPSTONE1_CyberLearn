async function testSubjectsAPI() {
  try {
    console.log("Testing subjects API endpoint...");

    // Test basic connection first
    console.log("Testing basic connection to server...");
    const healthResponse = await fetch("http://192.168.1.6:3000/");
    console.log("Health check status:", healthResponse.status);

    // First get all subjects
    console.log("Fetching subjects...");
    const subjectsResponse = await fetch(
      "http://192.168.1.6:3000/api/subjects"
    );
    console.log("Subjects response status:", subjectsResponse.status);

    if (subjectsResponse.ok) {
      const subjectsData = await subjectsResponse.json();
      console.log("Found", subjectsData.length, "subjects");

      if (subjectsData.length > 0) {
        const subjectId = subjectsData[0]._id;
        console.log("Testing with subject ID:", subjectId);

        // Test the students endpoint that was causing issues
        console.log("Fetching students for subject...");
        const studentsResponse = await fetch(
          `http://192.168.1.6:3000/api/subjects/${subjectId}/students`
        );
        console.log("Students response status:", studentsResponse.status);

        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          console.log(
            "Students response data:",
            JSON.stringify(studentsData, null, 2)
          );
        } else {
          const errorText = await studentsResponse.text();
          console.error("Students endpoint error:", errorText);
        }
      } else {
        console.log("No subjects found to test with");
      }
    } else {
      const errorText = await subjectsResponse.text();
      console.error("Subjects endpoint error status:", subjectsResponse.status);
      console.error("Subjects endpoint error:", errorText);
    }
  } catch (error) {
    console.error("Test failed with error:", error.message);
    console.error("Full error:", error);
  }
}

testSubjectsAPI();
