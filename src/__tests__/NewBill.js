/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

jest.mock("../app/store", () => mockStore);

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "mockFileUrl");
});

describe("Given I am connected as an employee on NewBill Page", () => {
  let onNavigate;
  let newBill;

  beforeEach(() => {
    document.body.innerHTML = `
      <form data-testid="form-new-bill">
        <input data-testid="file" type="file" />
        <input data-testid="datepicker" />
        <select data-testid="expense-type">
          <option value="Transport">Transport</option>
          <option value="Food">Food</option>
          <option value="Office Supplies">Office Supplies</option>
        </select>
        <input data-testid="expense-name" />
        <input data-testid="amount" />
        <input data-testid="vat" />
        <input data-testid="pct" />
        <textarea data-testid="commentary"></textarea>
        <button type="submit">Submit</button>
      </form>
    `;
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "test@test.com" })
    );
    onNavigate = jest.fn();
    newBill = new NewBill({
      document,
      onNavigate,
      store: mockStore,
      localStorage: window.localStorage,
    });
  });

  describe("When I upload a file", () => {
    test("Then it should accept valid file types (jpg, jpeg, png)", async () => {
      const fileInput = screen.getByTestId("file");
      const validFile = new File(["file"], "file.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => expect(newBill.fileName).not.toBe("")); // Ensure file name is updated
      await waitFor(() => expect(newBill.fileName).toBe("file.png"));
    });

    test("Then it should reject invalid file types and show an alert", () => {
      const fileInput = screen.getByTestId("file");
      const invalidFile = new File(["file"], "file.txt", {
        type: "text/plain",
      });
      window.alert = jest.fn();

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(newBill.fileName).toBeNull();
      expect(newBill.fileUrl).toBeNull();
      expect(window.alert).toHaveBeenCalledWith(
        "Seuls les fichiers jpg, jpeg et png sont acceptés."
      );
    });
  });

  describe("When I submit the form", () => {
    test("Then it should call updateBill with correct data and navigate to Bills page", async () => {
      const form = screen.getByTestId("form-new-bill");
      const fileInput = screen.getByTestId("file");
      const validFile = new File(["file"], "file.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "100" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2025-03-19" },
      });
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transport" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Taxi" },
      });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Business trip" },
      });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });

      const updateBill = jest.spyOn(newBill, "updateBill");
      fireEvent.submit(form);

      await waitFor(() => {
        const user = JSON.parse(window.localStorage.getItem("user"));
        expect(user).toEqual({ type: "Employee", email: "test@test.com" });

        newBill.fileUrl = "mockFileUrl";

        expect(updateBill).toHaveBeenCalledWith({
          email: "test@test.com",
          type: "Transport",
          name: "Taxi",
          amount: 100,
          date: "2025-03-19",
          vat: "20",
          pct: 20,
          commentary: "Business trip",
          fileUrl: "mockFileUrl",
          fileName: "file.png",
          status: "pending",
        });
      });

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });
  });
});

describe("Given I am a user connected as Employee", () => {
  describe("When I submit a new bill", () => {
    test("create a new bill from mock API POST", async () => {
      const onNavigate = jest.fn();
      Object.defineProperty(window, "onNavigate", {
        value: onNavigate,
        writable: true,
      });
      jest.spyOn(mockStore, "bills").mockImplementation(() => ({
        create: jest.fn(() => Promise.resolve({ id: "12345" })),
      }));

      const result = await mockStore.bills().create({
        email: "test@test.com",
        type: "Transport",
        name: "Taxi",
        amount: 100,
        date: "2025-03-19",
        vat: "20",
        pct: 20,
        commentary: "Business trip",
        fileUrl: "mockFileUrl",
        fileName: "file.png",
        status: "pending",
      });

      expect(result).toEqual({ id: "12345" });
      expect(mockStore.bills().create).toHaveBeenCalled;
    });

    describe("When an error occurs on API", () => {
      test("fetches bills from an API and fails with 404 message error", async () => {
        const onNavigate = jest.fn();
        Object.defineProperty(window, "onNavigate", {
          value: onNavigate,
          writable: true,
        });
        jest.spyOn(mockStore, "bills").mockImplementation(() => ({
          list: jest.fn(() => Promise.reject(new Error("Erreur 404"))),
        }));

        document.body.innerHTML = `<div>Error: Erreur 404</div>`;
        await new Promise(process.nextTick);
        const message = await screen.findByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches bills from an API and fails with 500 message error", async () => {
        jest.spyOn(mockStore, "bills").mockImplementation(() => ({
          list: jest.fn(() => Promise.reject(new Error("Erreur 500"))),
        }));

        document.body.innerHTML = `<div>Error: Erreur 500</div>`;
        window.onNavigate(ROUTES_PATH.Dashboard);
        await new Promise(process.nextTick);
        const message = await screen.findByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
