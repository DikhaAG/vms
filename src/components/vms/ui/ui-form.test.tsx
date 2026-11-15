import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  UiFormField,
  UiTextInput,
  UiSelect,
  UiTextarea,
} from "./index";
import { useFormFieldContext } from "./form-field-context";

// Test probe consumer to inspect context values
function ProbeControl() {
  const ctx = useFormFieldContext();
  return (
    <input
      data-testid="probe"
      id={ctx?.id}
      aria-describedby={[ctx?.descriptionId, ctx?.errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={ctx?.isInvalid ? true : undefined}
      required={ctx?.isRequired}
      disabled={ctx?.isDisabled}
    />
  );
}

describe("UiFormField Primitive", () => {
  it("automatically generates an ID and binds label htmlFor to child input", () => {
    const html = renderToStaticMarkup(
      <UiFormField label="Nama Lengkap">
        <ProbeControl />
      </UiFormField>
    );

    expect(html).toContain("<label");
    expect(html).toContain("Nama Lengkap");
    expect(html).toContain("text-[var(--ks-ink)]");
    expect(html).toContain("font-bold");
    // Extract htmlFor and check probe id matches
    const match = html.match(/for="([^"]+)"/);
    expect(match).not.toBeNull();
    const generatedId = match![1];
    expect(generatedId).toBeTruthy();
    expect(html).toContain(`id="${generatedId}"`);
  });

  it("respects explicit id prop and propagates it to label and context", () => {
    const html = renderToStaticMarkup(
      <UiFormField id="custom-visitor-name" label="Nama Tamu">
        <ProbeControl />
      </UiFormField>
    );

    expect(html).toContain('for="custom-visitor-name"');
    expect(html).toContain('id="custom-visitor-name"');
  });

  it("renders required indicator when required prop is true", () => {
    const html = renderToStaticMarkup(
      <UiFormField label="Email Tamu" required>
        <ProbeControl />
      </UiFormField>
    );

    expect(html).toContain("Email Tamu");
    expect(html).toContain("*");
    expect(html).toContain('required=""');
  });

  it("renders optional badge in label slot", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        label="Nomor Plat Kendaraan"
        badge={<span data-testid="badge-tag">Opsional</span>}
      >
        <ProbeControl />
      </UiFormField>
    );

    expect(html).toContain("Nomor Plat Kendaraan");
    expect(html).toContain("Opsional");
    expect(html).toContain('data-testid="badge-tag"');
  });

  it("renders helper description with accessible ID and wires aria-describedby", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        id="phone-field"
        label="Nomor Telepon"
        description="Gunakan format internasional (+62)"
      >
        <ProbeControl />
      </UiFormField>
    );

    expect(html).toContain("Gunakan format internasional (+62)");
    expect(html).toContain('id="phone-field-desc"');
    expect(html).toContain('aria-describedby="phone-field-desc"');
  });

  it("renders accessible error message with role='alert' and wires aria-invalid", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        id="nik-field"
        label="Nomor NIK"
        error="NIK harus berisi 16 digit angka"
      >
        <ProbeControl />
      </UiFormField>
    );

    expect(html).toContain("NIK harus berisi 16 digit angka");
    expect(html).toContain('role="alert"');
    expect(html).toContain('id="nik-field-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="nik-field-error"');
  });
});

describe("UiTextInput Primitive", () => {
  it("renders standalone input with Kinpaku tokens and defaults", () => {
    const html = renderToStaticMarkup(
      <UiTextInput placeholder="Ketik di sini..." />
    );

    expect(html).toContain('type="text"');
    expect(html).toContain('placeholder="Ketik di sini..."');
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("bg-[var(--ks-paper)]");
    expect(html).toContain("text-[var(--ks-ink)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
  });

  it("applies tactile focus and disabled styling", () => {
    const html = renderToStaticMarkup(
      <UiTextInput disabled defaultValue="Terkunci" />
    );

    expect(html).toContain("disabled");
    expect(html).toContain("disabled:opacity-50");
    expect(html).toContain("disabled:cursor-not-allowed");
    expect(html).toContain("disabled:bg-[var(--ks-paper-deep)]");
    expect(html).toContain("focus:outline-hidden");
    expect(html).toContain("focus:border-[var(--ks-edge)]");
    expect(html).toContain("focus:ring-1");
    expect(html).toContain("focus:ring-[var(--ks-edge)]");
  });

  it("preserves caller aria-describedby without clobbering context error and description", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        id="phone"
        description="Format nomor telepon"
        error="Nomor telepon tidak valid"
      >
        <UiTextInput aria-describedby="custom-hint-id" />
      </UiFormField>
    );

    expect(html).toContain(
      'aria-describedby="custom-hint-id phone-desc phone-error"'
    );
  });

  it("applies vermilion border and aria-invalid when isInvalid is set", () => {
    const html = renderToStaticMarkup(
      <UiTextInput isInvalid defaultValue="Salah" />
    );

    expect(html).toContain("border-[var(--ks-vermilion)]");
    expect(html).toContain("focus:border-[var(--ks-vermilion)]");
    expect(html).toContain('aria-invalid="true"');
  });

  it("seamlessly consumes UiFormField context without manual wiring", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        id="email-input"
        label="Alamat Email"
        description="Contoh: user@tam.co.id"
        error="Format email tidak valid"
      >
        <UiTextInput type="email" placeholder="user@domain.com" />
      </UiFormField>
    );

    expect(html).toContain('for="email-input"');
    expect(html).toContain('id="email-input"');
    expect(html).toContain('type="email"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="email-input-desc email-input-error"');
    expect(html).toContain("border-[var(--ks-vermilion)]");
  });
});

describe("UiSelect Primitive", () => {
  it("renders select with Kinpaku styling and custom chevron indicator", () => {
    const html = renderToStaticMarkup(
      <UiSelect defaultValue="id">
        <option value="id">KTP / NIK</option>
        <option value="passport">Paspor</option>
      </UiSelect>
    );

    expect(html).toContain("<select");
    expect(html).toContain("appearance-none");
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("bg-[var(--ks-paper)]");
    expect(html).toContain("text-[var(--ks-ink)]");
    expect(html).toContain("KTP / NIK");
    // Verify chevron SVG is present
    expect(html).toContain("<svg");
    expect(html).toContain('stroke="currentColor"');
  });

  it("renders options from options prop array when provided", () => {
    const html = renderToStaticMarkup(
      <UiSelect
        options={[
          { value: "fac-1", label: "Kantor Pusat Jakarta" },
          { value: "fac-2", label: "Cabang Surabaya", disabled: true },
        ]}
      />
    );

    expect(html).toContain('value="fac-1"');
    expect(html).toContain("Kantor Pusat Jakarta");
    expect(html).toContain('value="fac-2"');
    expect(html).toContain("Cabang Surabaya");
    expect(html).toContain("disabled");
  });

  it("applies error styling and wires with UiFormField context", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        id="facility-select"
        label="Pilih Fasilitas"
        error="Fasilitas wajib dipilih"
      >
        <UiSelect>
          <option value="">Pilih...</option>
          <option value="hq">Gedung Pusat</option>
        </UiSelect>
      </UiFormField>
    );

    expect(html).toContain('for="facility-select"');
    expect(html).toContain('id="facility-select"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="facility-select-error"');
    expect(html).toContain("border-[var(--ks-vermilion)]");
  });
});

describe("UiTextarea Primitive", () => {
  it("renders textarea with default 3 rows and Kinpaku tokens", () => {
    const html = renderToStaticMarkup(
      <UiTextarea placeholder="Catatan tambahan..." />
    );

    expect(html).toContain("<textarea");
    expect(html).toContain('rows="3"');
    expect(html).toContain('placeholder="Catatan tambahan..."');
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("bg-[var(--ks-paper)]");
    expect(html).toContain("text-[var(--ks-ink)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
  });

  it("supports custom row count, disabled styling, and invalid states", () => {
    const html = renderToStaticMarkup(
      <UiTextarea rows={5} disabled isInvalid defaultValue="Teks error" />
    );

    expect(html).toContain('rows="5"');
    expect(html).toContain("disabled");
    expect(html).toContain("disabled:opacity-50");
    expect(html).toContain("disabled:cursor-not-allowed");
    expect(html).toContain("border-[var(--ks-vermilion)]");
    expect(html).toContain('aria-invalid="true"');
  });

  it("wires automatically inside UiFormField context", () => {
    const html = renderToStaticMarkup(
      <UiFormField
        id="rejection-reason"
        label="Alasan Penolakan"
        description="Jelaskan alasan penolakan secara jelas"
        error="Alasan penolakan wajib diisi minimal 10 karakter"
      >
        <UiTextarea placeholder="Masukkan alasan..." />
      </UiFormField>
    );

    expect(html).toContain('for="rejection-reason"');
    expect(html).toContain('id="rejection-reason"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(
      'aria-describedby="rejection-reason-desc rejection-reason-error"'
    );
    expect(html).toContain("border-[var(--ks-vermilion)]");
  });
});

describe("Form Component Suite Barrel Exports and Integration", () => {
  it("exports all canonical form components and types from barrel index", () => {
    expect(UiFormField).toBeDefined();
    expect(UiTextInput).toBeDefined();
    expect(UiSelect).toBeDefined();
    expect(UiTextarea).toBeDefined();
  });

  it("appends custom classNames to all form controls without overriding core tokens", () => {
    const inputHtml = renderToStaticMarkup(
      <UiTextInput className="custom-input-class" />
    );
    expect(inputHtml).toContain("custom-input-class");
    expect(inputHtml).toContain("rounded-[var(--ks-radius-md)]");

    const selectHtml = renderToStaticMarkup(
      <UiSelect className="custom-select-class">
        <option>Opsi</option>
      </UiSelect>
    );
    expect(selectHtml).toContain("custom-select-class");
    expect(selectHtml).toContain("appearance-none");

    const textareaHtml = renderToStaticMarkup(
      <UiTextarea className="custom-textarea-class" />
    );
    expect(textareaHtml).toContain("custom-textarea-class");
    expect(textareaHtml).toContain("rounded-[var(--ks-radius-md)]");
  });
});
