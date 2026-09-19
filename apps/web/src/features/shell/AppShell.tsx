import { DashboardPage } from "@/features/dashboard";
import {
  AddProductPage,
  BatchManagementPage,
  CatalogImportPage,
  EditProductPage,
  ExpiryManagementPage,
  InventoryPage,
  ProductDetailPage,
  ReceiveStockPage,
} from "@/features/inventory";
import { SaleDetailPage, SalesPage } from "@/features/sales";
import {
  CreatePurchaseOrderPage,
  PurchaseOrderDetailPage,
  PurchasingPage,
  ReceiveAgainstPurchaseOrderPage,
} from "@/features/purchasing";
import {
  AddSupplierPage,
  CreateReturnManifestPage,
  EditSupplierPage,
  ExpiryReturnsPage,
  ManifestDetailsPage,
  SupplierDetailsPage,
  SupplierIssuesPage,
  SuppliersPage,
} from "@/features/suppliers";
import {
  AddCustomerPage,
  CustomerDetailsPage,
  CustomersPage,
  EditCustomerPage,
  RegistrationReviewPage,
} from "@/features/customers";
import { AddStaffPage, EditStaffPage, ShiftDetailPage, ShiftManagementPage, StaffPage, StaffDetailPage } from "@/features/staff";
import { ReportsDashboardPage, SalesReportPage, InventoryReportPage, PurchaseReportPage, ProductMovementPage } from "@/features/reports";
import { AuditDashboardPage, AuditDetailPage } from "@/features/audit";
import { BusinessProfilePage, AccountProfilePage, SettingsHubPage } from "@/features/settings";
import { HelpPage } from "@/features/help";
import { useLocale } from "@/i18n";
import {
  auditSubpath,
  customersSubpath,
  inventorySubpath,
  purchasingSubpath,
  reportsSubpath,
  salesDetailIdFromPath,
  settingsSubpath,
  staffSubpath,
  suppliersSubpath,
} from "@/lib/ownerPath";
import { useOwnerPath } from "@/lib/OwnerPathProvider";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

function ShellMain() {
  const { path, pathname } = useOwnerPath();
  if (path === "/sales") {
    const saleId = salesDetailIdFromPath(pathname);
    if (saleId) return <SaleDetailPage saleId={saleId} />;
    return <SalesPage />;
  }
  if (path === "/inventory") {
    const sub = inventorySubpath(pathname);
    if (sub.kind === "list") return <InventoryPage />;
    if (sub.kind === "expiry") return <ExpiryManagementPage />;
    if (sub.kind === "new") return <AddProductPage />;
    if (sub.kind === "import") return <CatalogImportPage />;
    if (sub.kind === "edit") {
      return <EditProductPage key={sub.productId} productId={sub.productId} />;
    }
    if (sub.kind === "receive") {
      return (
        <ReceiveStockPage key={sub.productId} productId={sub.productId} />
      );
    }
    if (sub.kind === "batch") {
      return (
        <BatchManagementPage
          key={`${sub.productId}-${sub.batchId}`}
          productId={sub.productId}
          batchId={sub.batchId}
        />
      );
    }
    if (sub.kind === "detail") {
      return (
        <ProductDetailPage key={sub.productId} productId={sub.productId} />
      );
    }
  }
  if (path === "/purchasing") {
    const sub = purchasingSubpath(pathname);
    if (sub.kind === "list") return <PurchasingPage />;
    if (sub.kind === "new") return <CreatePurchaseOrderPage />;
    if (sub.kind === "receive") {
      return (
        <ReceiveAgainstPurchaseOrderPage key={sub.poId} poId={sub.poId} />
      );
    }
    if (sub.kind === "detail") {
      return <PurchaseOrderDetailPage key={sub.poId} poId={sub.poId} />;
    }
    return <PurchasingPlaceholder />;
  }
  if (path === "/suppliers") {
    const sub = suppliersSubpath(pathname);
    if (sub.kind === "list") return <SuppliersPage />;
    if (sub.kind === "new") return <AddSupplierPage />;
    if (sub.kind === "issues") return <SupplierIssuesPage />;
    if (sub.kind === "returns") return <ExpiryReturnsPage />;
    if (sub.kind === "returnsNew") return <CreateReturnManifestPage />;
    if (sub.kind === "returnsManifest") {
      return (
        <ManifestDetailsPage
          key={sub.manifestId}
          manifestId={sub.manifestId}
        />
      );
    }
    if (sub.kind === "edit") {
      return (
        <EditSupplierPage key={sub.supplierId} supplierId={sub.supplierId} />
      );
    }
    if (sub.kind === "detail") {
      return (
        <SupplierDetailsPage key={sub.supplierId} supplierId={sub.supplierId} />
      );
    }
  }
  if (path === "/customers") {
    const sub = customersSubpath(pathname);
    if (sub.kind === "list") return <CustomersPage />;
    if (sub.kind === "new") return <AddCustomerPage />;
    if (sub.kind === "review") {
      return (
        <RegistrationReviewPage
          key={sub.customerId}
          customerId={sub.customerId}
        />
      );
    }
    if (sub.kind === "edit") {
      return <EditCustomerPage key={sub.customerId} customerId={sub.customerId} />;
    }
    if (sub.kind === "detail") {
      return <CustomerDetailsPage key={sub.customerId} customerId={sub.customerId} />;
    }
  }
  if (path === "/staff") {
    const sub = staffSubpath(pathname);
    if (sub.kind === "list") return <StaffPage />;
    if (sub.kind === "new") return <AddStaffPage />;
    if (sub.kind === "shifts") return <ShiftManagementPage />;
    if (sub.kind === "shiftDetail") {
      return <ShiftDetailPage shiftId={sub.shiftId} />;
    }
    if (sub.kind === "detail") {
      return <StaffDetailPage userId={sub.userId} />;
    }
    if (sub.kind === "edit") {
      return <EditStaffPage userId={sub.userId} />;
    }
    return (
      <StaffPlaceholder
        titleKey="staff.placeholder.title"
        hintKey="staff.placeholder.hint"
      />
    );
  }
  if (path === "/reports") {
    const sub = reportsSubpath(pathname);
    if (sub.kind === "sales") return <SalesReportPage />;
    if (sub.kind === "inventory") return <InventoryReportPage />;
    if (sub.kind === "purchasing") return <PurchaseReportPage />;
    if (sub.kind === "productMovement") return <ProductMovementPage />;
    return <ReportsDashboardPage />;
  }
  if (path === "/audit") {
    const sub = auditSubpath(pathname);
    if (sub.kind === "detail") {
      return <AuditDetailPage key={sub.auditId} auditId={sub.auditId} />;
    }
    return <AuditDashboardPage />;
  }
  if (path === "/settings") {
    const sub = settingsSubpath(pathname);
    if (sub.kind === "business") return <BusinessProfilePage />;
    if (sub.kind === "account") return <AccountProfilePage />;
    return <SettingsHubPage />;
  }
  if (path === "/help") {
    return <HelpPage />;
  }
  return <DashboardPage />;
}

function PurchasingPlaceholder() {
  const { t } = useLocale();
  return (
    <section className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          {t("purchasing.placeholder.editTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {t("purchasing.placeholder.edit")}
        </p>
      </div>
    </section>
  );
}

function StaffPlaceholder({
  titleKey,
  hintKey,
}: {
  titleKey:
    | "staff.placeholder.title"
    | "staff.placeholder.newTitle"
    | "staff.placeholder.editTitle"
    | "staff.shifts.placeholder.detailTitle";
  hintKey:
    | "staff.placeholder.hint"
    | "staff.placeholder.newHint"
    | "staff.placeholder.editHint"
    | "staff.shifts.placeholder.detailHint";
}) {
  const { t } = useLocale();
  return (
    <section className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{t(titleKey)}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t(hintKey)}</p>
      </div>
    </section>
  );
}

/**
 * Locked Admin Portal chrome. Dashboard KPIs are Batch G; Sales list is Batch H;
 * Transaction Details is Batch I; Inventory list is Batch J; Product Details is Batch K;
 * Receive Stock is Batch M. Expiry Management is Batch N. Batch S enables
 * Purchasing and Suppliers as localized placeholder shells. Batch T fills the
 * Purchasing list; Batch U fills Create Purchase Order; Batch V fills the
 * Purchase Order Details page; Batch W fills Receive Stock against a PO
 * (/purchasing/:poId/receive). edit still renders a localized placeholder.
 * Batch X fills the Suppliers directory. Batch Y fills the Add Supplier form
 * (/suppliers/new). Batch Z fills the live Supplier Details page
 * (/suppliers/:supplierId). Prod P2 fills Edit Supplier at /suppliers/:id/edit.
 * Batch AA fills the Expiry Returns queue at
 * /suppliers/returns. Batch AB fills Create Return Manifest at
 * /suppliers/returns/new. Batch AC fills Manifest Details at
 * /suppliers/returns/:manifestId (Dispatch / Decision / Complete modals).
 * Batch AG enables Customers as a live chrome route (/customers,
 * /customers/new, /customers/:id, /customers/:id/review) with placeholder
 * shells; Batch AH fills the directory, Batch AI fills /customers/new
 * (Add Customer + create confirm), Batch AJ fills /customers/:id
 * (Customer Details; pending redirects to Review), Batch AK fills
 * /customers/:id/review (Registration Review + Approve/Reject). Batch BC
 * enables Reports at /reports; Purchase Report stays parked until P6. Batch BF
 * fills /reports/sales; Prod P5 fills /reports/inventory; Prod P6 fills
 * /reports/purchasing. Enhance D2 fills /reports/product-movement. Batch BJ fills /audit; Batch BK fills /audit/:auditId.
 * Batch BN fills /settings hub and /settings/business Business Profile.
 * Batch BO fills /settings/account Account Profile (footer Owner Profile).
 * Batch BP fills /help Help & Support (footer Help).
 */
export function AppShell() {
  const { t } = useLocale();
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!navigationOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNavigationOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [navigationOpen]);

  return (
    <div className="flex h-full min-h-0 bg-canvas">
      <Sidebar className="hidden md:flex" />
      {navigationOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("nav.closeMenu")}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setNavigationOpen(false)}
          />
          <Sidebar className="relative h-full shadow-2xl" onClose={() => setNavigationOpen(false)} />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas-pattern">
        <Header onOpenNavigation={() => setNavigationOpen(true)} />
        <main className="min-h-0 flex-1 overflow-auto bg-transparent">
          <ShellMain />
        </main>
      </div>
    </div>
  );
}
