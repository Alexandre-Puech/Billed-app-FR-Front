/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import Bills from "../containers/Bills.js";
import $ from "jquery";
import "bootstrap";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    //new tests start here
    test("Then, when I click on the new bill button, the bill creation panel should open", () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      const newBillButton = screen.getByTestId("btn-new-bill");
      newBillButton.click();
      const newBillForm = screen.getByTestId("form-new-bill");
      expect(newBillForm).toBeInTheDocument; //trouver la bonne fonction
    });
    test("Then, when I click on the icon eye, the modal should open", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      await waitFor(() => screen.getAllByTestId("icon-eye"));
      const eyeIcons = screen.getAllByTestId("icon-eye");
      const eyeIcon = eyeIcons[0];
      eyeIcon.click();

      $("#modaleFile").modal("show");

      const modale = await waitFor(() => screen.getByTestId("proof-modal"));
      expect(modale).toBeInTheDocument;
    });
    describe("Given I am connected as an employee", () => {
      describe("When I call getBills", () => {
        test("Then it should return an array of formatted bills", async () => {
          const store = {
            bills: jest.fn(() => ({
              list: jest.fn(() =>
                Promise.resolve([
                  { date: "2021-04-01", status: "pending" },
                  { date: "2021-03-01", status: "accepted" },
                ])
              ),
            })),
          };

          const billsInstance = new Bills({ document, store });

          const bills = await billsInstance.getBills();
          expect(bills).toEqual([
            { date: "1 Avr. 21", status: "En attente" },
            { date: "1 Mar. 21", status: "Accepté" },
          ]);
        });

        test("Then it should handle corrupted data", async () => {
          const store = {
            bills: jest.fn(() => ({
              list: jest.fn(() =>
                Promise.resolve([{ date: "invalid-date", status: "pending" }])
              ),
            })),
          };

          const billsInstance = new Bills({ document, store });

          const bills = await billsInstance.getBills();
          expect(bills).toEqual([
            { date: "invalid-date", status: "En attente" },
          ]);
        });
      });
    });
  });
});
// test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I'm on layout", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("tbody"));
      const bills = await screen.getByTestId("tbody");
      expect(bills).toBeTruthy();
    });
    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });
      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.findByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.findByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
