import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";

// Mock supabase before importing the hook
vi.mock("../../../../supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a mock user
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "user-123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create mock auth return value
function createMockAuthReturn(user: User | null, isGuest = false) {
  return {
    user,
    isGuest,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    signInAsGuest: vi.fn(),
  };
}

describe("usePassageGenerator", () => {
  let usePassageGenerator: typeof import("./usePassageGenerator").usePassageGenerator;
  let supabase: typeof import("../../../../supabase/client").supabase;
  let useAuth: typeof import("@/contexts/AuthContext/AuthContext").useAuth;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamic imports to ensure mocks are active
    const hookModule = await import("./usePassageGenerator");
    usePassageGenerator = hookModule.usePassageGenerator;

    const supabaseModule = await import("../../../../supabase/client");
    supabase = supabaseModule.supabase;

    const authModule = await import("@/contexts/AuthContext/AuthContext");
    useAuth = authModule.useAuth;

    // Setup stub env
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const mockUser = createMockUser();

  it("initializes with default state", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    expect(result.current.ageLevel).toBe(12);
    expect(result.current.topic).toBe("");
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generatedPassage).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it("setAgeLevel updates age level to numeric value", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.setAgeLevel(8);
    });

    expect(result.current.ageLevel).toBe(8);
  });

  it("setAgeLevel updates age level to special value", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.setAgeLevel("professional");
    });

    expect(result.current.ageLevel).toBe("professional");
  });

  it("setTopic updates topic", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.setTopic("A story about animals");
    });

    expect(result.current.topic).toBe("A story about animals");
  });

  it("openGenerator sets isOpen to true", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.openGenerator();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("closeGenerator sets isOpen to false", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.openGenerator();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeGenerator();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("clearPassage resets generated passage and error", () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.clearPassage();
    });

    expect(result.current.generatedPassage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("generatePassage validates topic for guest users", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(null, true));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    // Topic is empty by default
    await act(async () => {
      await result.current.generatePassage();
    });

    expect(result.current.error).toContain("topic");
    expect(onPassageGenerated).not.toHaveBeenCalled();
  });

  it("generatePassage validates topic before generating", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    // Topic is empty by default
    await act(async () => {
      await result.current.generatePassage();
    });

    expect(result.current.error).toContain("topic");
  });

  it("generatePassage validates short topic", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.setTopic("short");
    });

    await act(async () => {
      await result.current.generatePassage();
    });

    expect(result.current.error).toContain("10 characters");
  });

  it("generatePassage proceeds when authenticated user has no vocabulary words", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    // Mock empty vocabulary list
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    // Must mock session for authenticated flow
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    const generatedPassage = "שָׁלוֹם לְכֻלָּם! זֶה סִפּוּר קָצָר.";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ passage: generatedPassage }),
    });

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.setTopic("A story about animals and nature");
    });

    await act(async () => {
      await result.current.generatePassage();
    });

    expect(onPassageGenerated).toHaveBeenCalledWith(generatedPassage);
    expect(result.current.error).toBeNull();

    // Uses session token for authenticated users
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("generate-hebrew-passage"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("generatePassage allows guests to generate without vocabulary", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(null, true));
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

    const generatedPassage = "שָׁלוֹם לְכֻלָּם! זֶה סִפּוּר עַל חַיּוֹת.";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ passage: generatedPassage }),
    });

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    act(() => {
      result.current.openGenerator();
      result.current.setTopic("A story about animals and nature");
    });

    await act(async () => {
      await result.current.generatePassage();
    });

    // Verify guest can generate passages
    expect(onPassageGenerated).toHaveBeenCalledWith(generatedPassage);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.error).toBeNull();

    // Verify fetch was called with anon key for guest
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("generate-hebrew-passage"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-anon-key",
        }),
      })
    );
  });

  it("generatePassage calls onPassageGenerated and closes dialog on success", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuthReturn(mockUser));

    const mockVocabulary = [
      {
        id: "1",
        hebrew_word: "שלום",
        english_translation: "peace",
        confidence_score: 50,
        incorrect_count: 2,
        total_attempts: 5,
      },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockVocabulary, error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    const generatedPassage = "שָׁלוֹם לְכֻלָּם! זֶה סִפּוּר עַל חַיּוֹת.";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ passage: generatedPassage }),
    });

    const onPassageGenerated = vi.fn();
    const { result } = renderHook(() => usePassageGenerator(onPassageGenerated));

    // Open the generator and set a valid topic
    act(() => {
      result.current.openGenerator();
      result.current.setTopic("A story about animals and nature");
    });

    expect(result.current.isOpen).toBe(true);

    await act(async () => {
      await result.current.generatePassage();
    });

    // Verify onPassageGenerated was called with the passage
    expect(onPassageGenerated).toHaveBeenCalledWith(generatedPassage);

    // Verify dialog is closed after successful generation
    expect(result.current.isOpen).toBe(false);

    // Verify no error
    expect(result.current.error).toBeNull();
  });
});
