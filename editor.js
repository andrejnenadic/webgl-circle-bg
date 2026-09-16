(() => {
  const SUPPORTED_TYPES = new Set([
    "float",
    "int",
    "bool",
    "vec2",
    "vec3",
    "vec4",
  ]);

  function parseUniforms(shaderSource) {
    const matches = shaderSource.matchAll(
      /^\s*uniform\s+([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/gm,
    );

    return Array.from(matches, ([, type, name]) => ({
      type,
      name,
      supported: SUPPORTED_TYPES.has(type),
    }));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function componentToHex(component) {
    return Math.round(clamp(component, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  }

  function rgbToHex(color) {
    return `#${color.map(componentToHex).join("")}`;
  }

  function hexToRgb(hex) {
    const normalized = hex.replace(/^#/, "");
    return [0, 2, 4].map((offset) => {
      const component = normalized.slice(offset, offset + 2);
      return Number.parseInt(component || "00", 16) / 255;
    });
  }

  function normalizeHex(hex) {
    const trimmed = hex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return `#${trimmed
        .slice(1)
        .split("")
        .map((component) => component + component)
        .join("")}`.toLowerCase();
    }

    return null;
  }

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (textContent != null) element.textContent = textContent;
    return element;
  }

  function defaultValueForUniform(uniform) {
    if (/seed/i.test(uniform.name)) {
      return Math.random();
    }

    if (uniform.name === "u_band_count") {
      return 15;
    }

    if (uniform.name === "u_band_base_width") {
      return 0.75;
    }

    if (uniform.name === "u_band_base_speed") {
      return 2;
    }

    if (uniform.name === "u_band_min_speed") {
      return 1;
    }

    if (uniform.name === "u_base_color") {
      return [0.278, 0.796, 0.831];
    }

    if (uniform.type === "bool") {
      return false;
    }

    if (uniform.type === "int") {
      return 0;
    }

    if (uniform.type === "vec2") {
      return [0, 0];
    }

    if (uniform.type === "vec3") {
      return [0, 0, 0];
    }

    if (uniform.type === "vec4") {
      return [0, 0, 0, 1];
    }

    return 0;
  }

  function createNumberInput(min, max, step, value) {
    const input = createElement("input");
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    return input;
  }

  function createVectorControl(uniform, initialValue, notifyChange) {
    if (/color/i.test(uniform.name)) {
      const controls = createElement("div", "uniform-panel__controls");
      const row = createElement("div", "uniform-panel__row");
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = rgbToHex(initialValue);

      const hexInput = createElement("input");
      hexInput.type = "text";
      hexInput.spellcheck = false;
      hexInput.autocomplete = "off";
      hexInput.value = picker.value;

      const syncHex = (value) => {
        const normalized = normalizeHex(value);
        if (!normalized) {
          return false;
        }

        picker.value = normalized;
        hexInput.value = normalized;
        return true;
      };

      picker.addEventListener("input", () => {
        hexInput.value = picker.value;
        notifyChange();
      });

      hexInput.addEventListener("input", () => {
        if (syncHex(hexInput.value)) {
          notifyChange();
        }
      });

      hexInput.addEventListener("blur", () => {
        hexInput.value = picker.value;
      });

      row.append(picker, hexInput);
      controls.append(row);

      return {
        element: controls,
        getValue() {
          return hexToRgb(picker.value);
        },
        setValue(nextValue) {
          const nextHex = rgbToHex(nextValue);
          picker.value = nextHex;
          hexInput.value = nextHex;
        },
      };
    }

    const container = createElement("div", "uniform-panel__vector");
    const values = initialValue.slice();
    const inputs = [];

    for (let index = 0; index < values.length; index += 1) {
      const input = createNumberInput(-10, 10, 0.001, values[index]);
      input.addEventListener("input", () => {
        values[index] = input.valueAsNumber;
        notifyChange();
      });
      inputs.push(input);
      container.appendChild(input);
    }

    return {
      element: container,
      getValue() {
        return values.slice();
      },
      setValue(nextValue) {
        nextValue.forEach((component, index) => {
          values[index] = component;
          inputs[index].value = String(component);
        });
      },
    };
  }

  function createFloatControl(uniform, initialValue, notifyChange) {
    const controls = createElement("div", "uniform-panel__controls");
    const isTimeUniform = /time/i.test(uniform.name);
    const isInteger = uniform.type === "int";
    const isBandCount = uniform.name === "u_band_count";

    if (isTimeUniform) {
      const toggle = createElement("label", "uniform-panel__toggle");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      const labelText = createElement("span", null, "Animate");
      toggle.append(checkbox, labelText);

      let animated = true;
      let frozenTime = null;
      let currentTime = initialValue;

      checkbox.addEventListener("change", () => {
        animated = checkbox.checked;
        if (!animated) {
          frozenTime = currentTime;
        } else {
          frozenTime = null;
        }
        notifyChange();
      });

      controls.append(toggle);

      return {
        element: controls,
        getValue(nowSeconds) {
          currentTime = nowSeconds;
          return animated ? nowSeconds : frozenTime;
        },
        setValue(nextValue) {
          frozenTime = nextValue;
        },
      };
    }

    const range = document.createElement("input");
    range.type = "range";
    range.min = /seed/i.test(uniform.name)
      ? "0"
      : uniform.name === "u_band_base_width"
        ? "0"
        : uniform.name === "u_band_base_speed"
          ? "0"
          : isBandCount
            ? "1"
            : "0";
    range.max = /seed/i.test(uniform.name)
      ? "1"
      : uniform.name === "u_band_base_width"
        ? "1"
        : uniform.name === "u_band_base_speed"
          ? "5"
          : isBandCount
            ? "64"
            : "5";
    range.step =
      uniform.name === "u_band_base_speed" ? "0.01" : isInteger ? "1" : "0.001";
    range.value = String(initialValue);

    const number = createNumberInput(
      Number(range.min),
      Number(range.max),
      Number(range.step),
      initialValue,
    );

    const sync = (value) => {
      range.value = String(value);
      number.value = String(value);
    };

    range.addEventListener("input", () => {
      sync(range.valueAsNumber);
      notifyChange();
    });

    number.addEventListener("input", () => {
      const nextValue = clamp(
        number.valueAsNumber,
        Number(range.min),
        Number(range.max),
      );
      sync(isInteger ? Math.round(nextValue) : nextValue);
      notifyChange();
    });

    controls.append(range, number);

    return {
      element: controls,
      getValue() {
        return isInteger
          ? Math.round(number.valueAsNumber)
          : number.valueAsNumber;
      },
      setValue(nextValue) {
        sync(nextValue);
      },
    };
  }

  function createScalarControl(uniform, initialValue, notifyChange) {
    const initial =
      uniform.type === "bool" ? Boolean(initialValue) : initialValue;

    if (uniform.type === "bool") {
      const controls = createElement("div", "uniform-panel__controls");
      const label = createElement("label", "uniform-panel__toggle");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = initial;
      label.append(checkbox, createElement("span", null, "Enabled"));
      checkbox.addEventListener("change", () => {
        notifyChange();
      });
      controls.append(label);
      return {
        element: controls,
        getValue() {
          return checkbox.checked;
        },
        setValue(nextValue) {
          checkbox.checked = Boolean(nextValue);
        },
      };
    }

    return createFloatControl(uniform, initial, notifyChange);
  }

  function createUnsupportedControl(uniform) {
    const note = createElement(
      "div",
      "uniform-panel__note",
      `No editor is available for ${uniform.type}.`,
    );
    return {
      element: note,
      getValue() {
        return null;
      },
      setValue() {},
    };
  }

  function createUniformEditor({ host, shaderSource, onChange }) {
    const uniforms = parseUniforms(shaderSource).map((uniform) => ({
      ...uniform,
      value: defaultValueForUniform(uniform),
    }));

    const panel = createElement("aside", "uniform-panel");
    const details = document.createElement("details");
    details.open = true;
    const summary = createElement("summary", null, "Uniforms");
    const body = createElement("div", "uniform-panel__body");
    const exportButton = createElement(
      "button",
      "uniform-panel__export",
      "Export values",
    );
    exportButton.type = "button";

    details.append(summary, body, exportButton);
    panel.appendChild(details);
    host.appendChild(panel);

    const controls = new Map();

    const notifyChange = () => {
      if (typeof onChange === "function") {
        onChange();
      }
    };

    for (const uniform of uniforms) {
      const item = createElement("section", "uniform-panel__item");
      const header = createElement("div", "uniform-panel__header");
      header.append(
        createElement("div", "uniform-panel__name", uniform.name),
        createElement("div", "uniform-panel__type", uniform.type),
      );

      let control;
      if (!uniform.supported) {
        control = createUnsupportedControl(uniform);
      } else if (
        uniform.type === "vec2" ||
        uniform.type === "vec3" ||
        uniform.type === "vec4"
      ) {
        control = createVectorControl(uniform, uniform.value, notifyChange);
      } else {
        control = createScalarControl(uniform, uniform.value, notifyChange);
      }

      item.append(header, control.element);
      body.appendChild(item);
      controls.set(uniform.name, control);
    }

    const getUniformValueObject = (nowSeconds = 0) => {
      const values = {};
      for (const uniform of uniforms) {
        const control = controls.get(uniform.name);
        values[uniform.name] = control ? control.getValue(nowSeconds) : null;
      }
      return values;
    };

    const serializeJsValue = (value) => {
      if (Array.isArray(value)) {
        return `[${value.map(serializeJsValue).join(", ")}]`;
      }

      return JSON.stringify(value);
    };

    const serializeUniformObject = (uniformValues) => {
      const lines = uniforms.map((uniform) => {
        const value = uniformValues[uniform.name];
        return `  ${uniform.name}: ${serializeJsValue(value)}`;
      });

      return `{\n${lines.join(",\n")}\n}`;
    };

    exportButton.addEventListener("click", async () => {
      const exportedText = serializeUniformObject(
        getUniformValueObject(performance.now() / 1000),
      );

      try {
        await navigator.clipboard.writeText(exportedText);
        exportButton.textContent = "Copied";
      } catch (error) {
        console.error("Failed to copy uniform values", error);
        exportButton.textContent = "Copy failed";
      }

      window.setTimeout(() => {
        exportButton.textContent = "Export values";
      }, 1000);
    });

    return {
      uniforms,
      getUniformValueObject,
      getUniformValue(name, nowSeconds = 0) {
        const control = controls.get(name);
        if (!control) return null;
        return control.getValue(nowSeconds);
      },
      getUniformValues(nowSeconds = 0) {
        const values = {};
        for (const uniform of uniforms) {
          const control = controls.get(uniform.name);
          values[uniform.name] = control ? control.getValue(nowSeconds) : null;
        }
        return values;
      },
      setUniformValue(name, nextValue) {
        const control = controls.get(name);
        if (!control) return;
        control.setValue(nextValue);
      },
      destroy() {
        panel.remove();
      },
    };
  }

  window.createUniformEditor = createUniformEditor;
  window.parseShaderUniforms = parseUniforms;
})();
