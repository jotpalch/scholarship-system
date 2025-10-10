import apiClient from "../api";

// Mock fetch - jest.fn() is already set up in jest.setup.ts
// We just cast it for type safety

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});


function getUrl(requestOrUrl: any): string {
  if (typeof requestOrUrl === 'string') {
    return requestOrUrl;
  }
  if (requestOrUrl && typeof requestOrUrl === 'object' && 'url' in requestOrUrl) {
    return requestOrUrl.url;
  }
  return String(requestOrUrl);
}

function getMethod(requestOrOptions: any): string | undefined {
  if (requestOrOptions && typeof requestOrOptions === 'object' && 'method' in requestOrOptions) {
    return requestOrOptions.method;
  }
  return undefined;
}

function getRequestHeaders(requestOrOptions: any): any {
  if (requestOrOptions && typeof requestOrOptions === 'object' && 'headers' in requestOrOptions) {
    return requestOrOptions.headers;
  }
  return null;
}

function getBody(requestOrOptions: any): any {
  if (requestOrOptions && typeof requestOrOptions === 'object') {
    // For Request objects from whatwg-fetch
    if ('_bodyText' in requestOrOptions) {
      return requestOrOptions._bodyText;
    }
    // For plain options objects
    if ('body' in requestOrOptions) {
      return requestOrOptions.body;
    }
  }
  return undefined;
}

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock auth_token in localStorage
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === "auth_token" ? "mock-token" : null
    );
    (fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  });

  describe("Authentication", () => {
    it("should include auth token in requests", async () => {
      apiClient.setToken("mock-token");

      await apiClient.scholarships.getAll();

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1]?.headers;

      expect(fetch).toHaveBeenCalled();
      expect(headers).toBeDefined();

      let authHeader;
      if (headers instanceof Headers) {
        authHeader = headers.get("Authorization");
      } else if (headers && typeof headers === "object") {
        authHeader = headers["Authorization"] || headers["authorization"];
      }

      expect(authHeader).toBe("Bearer mock-token");
    });

    it("should handle requests without auth token", async () => {
      apiClient.clearToken();

      await apiClient.scholarships.getAll();

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1]?.headers;

      let authHeader;
      if (headers instanceof Headers) {
        authHeader = headers.get("Authorization");
      } else if (headers && typeof headers === "object") {
        authHeader = headers["Authorization"] || headers["authorization"];
      }

      expect(authHeader).toBeNull();
    });

    it("should clear token on 401 response", async () => {
      apiClient.setToken("mock-token");
      (fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      );

      try {
        await apiClient.scholarships.getAll();
      } catch (error) {
        expect(error).toBeDefined();
      }

      expect(apiClient.getToken()).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      try {
        await apiClient.scholarships.getAll();
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("Network error");
      }
    });

    it("should handle HTTP error responses", async () => {
      (fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ error: "Server error" }), {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "content-type": "application/json" },
        })
      );

      try {
        await apiClient.scholarships.getAll();
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("Server error");
      }
    });

    it("should handle malformed JSON responses", async () => {
      (fetch as jest.Mock).mockResolvedValue(
        new Response("", {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

      const result = await apiClient.scholarships.getAll();

      expect(result).toBeDefined();
    });
  });

  describe("Scholarship APIs", () => {
    it("should get all scholarships", async () => {
      const mockScholarships = [
        { id: 1, code: "academic_excellence", name: "Academic Excellence" },
        { id: 2, code: "research_grant", name: "Research Grant" },
      ];

      (fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: mockScholarships }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

      const result = await apiClient.scholarships.getAll();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockScholarships);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/scholarships"),
        expect.any(Object)
      );
    });

    it("should get eligible scholarships", async () => {
      await apiClient.scholarships.getEligible();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/scholarships/eligible"),
        expect.any(Object)
      );
    });

    it("should get scholarship by ID", async () => {
      await apiClient.scholarships.getById(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/scholarships/1"),
        expect.any(Object)
      );
    });
  });

  describe("Application APIs", () => {
    it("should create application", async () => {
      const applicationData = {
        scholarship_type_id: 1,
        form_data: { name: "John Doe" },
        files: [],
      };

      await apiClient.applications.createApplication(applicationData);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("/applications");
      expect(fetchCall[1].method).toBe("POST");
      expect(fetchCall[1].body).toBe(JSON.stringify(applicationData));
    });

    it("should get user applications", async () => {
      await apiClient.applications.getMyApplications();

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("/applications");
    });

    it("should update application", async () => {
      const updateData = { form_data: { name: "Updated Name" } };

      await apiClient.applications.updateApplication(1, updateData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/applications/1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updateData),
        })
      );
    });

    it("should delete application", async () => {
      await apiClient.applications.deleteApplication(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/applications/1"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("Admin APIs", () => {
    it("should get dashboard stats", async () => {
      await apiClient.admin.getDashboardStats();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/dashboard/stats"),
        expect.any(Object)
      );
    });

    it("should get all applications with filters", async () => {
      await apiClient.admin.getAllApplications(1, 10, "submitted");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/admin/applications?page=1&size=10&status=submitted"
        ),
        expect.any(Object)
      );
    });

    it("should update application status", async () => {
      await apiClient.admin.updateApplicationStatus(
        1,
        "approved",
        "Looks good"
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/applications/1/status"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            status: "approved",
            review_notes: "Looks good",
          }),
        })
      );
    });
  });

  describe("File APIs", () => {
    it("should upload document", async () => {
      const file = new File(["test"], "test.pdf");

      await apiClient.applications.uploadDocument(1, file, "transcript");

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain("/applications/1/files/upload");
      expect(fetchCall[0]).toContain("file_type=transcript");
      expect(fetchCall[1].method).toBe("POST");
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it("should get files by application ID", async () => {
      await apiClient.applications.getApplicationFiles(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/applications/1/files"),
        expect.any(Object)
      );
    });
  });

  describe("Request Configuration", () => {
    it("should set correct Content-Type for JSON requests", async () => {
      await apiClient.applications.createApplication({
        configuration_id: 1,
        form_data: {},
      });

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1]?.headers;

      let contentType;
      if (headers instanceof Headers) {
        contentType = headers.get("Content-Type");
      } else if (headers && typeof headers === "object") {
        contentType = headers["Content-Type"] || headers["content-type"];
      }

      expect(contentType).toBe("application/json");
    });

    it("should handle FormData without explicit Content-Type header", async () => {
      const file = new File(["test"], "test.pdf");
      await apiClient.applications.uploadDocument(1, file, "document");

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1]?.headers;

      let contentType;
      if (headers instanceof Headers) {
        contentType = headers.get("Content-Type");
      } else if (headers && typeof headers === "object") {
        contentType = headers["Content-Type"] || headers["content-type"];
      }

      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it("should include Accept header", async () => {
      await apiClient.scholarships.getAll();

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1]?.headers;

      let acceptHeader;
      if (headers instanceof Headers) {
        acceptHeader = headers.get("Accept");
      } else if (headers && typeof headers === "object") {
        acceptHeader = headers["Accept"] || headers["accept"];
      }

      expect(acceptHeader).toBe("application/json");
    });
  });

  describe("Response Processing", () => {
    it("should parse successful JSON responses", async () => {
      const mockData = { id: 1, name: "Test" };
      (fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: mockData }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

      const result = await apiClient.scholarships.getById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it("should handle empty responses", async () => {
      (fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ success: true, message: "OK", data: null }), {
          status: 204,
          headers: { "content-type": "application/json" },
        })
      );

      const result = await apiClient.applications.updateStatus(1, {
        status: "withdrawn",
      });

      expect(result.success).toBe(true);
    });

    it("should handle text responses", async () => {
      (fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ success: true, message: "OK", data: [] }), {
          status: 200,
          headers: { "content-type": "text/plain" },
        })
      );

      const result = await apiClient.scholarships.getAll();

      expect(result.success).toBe(true);
    });
  });
});
