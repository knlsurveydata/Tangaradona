function hasClass(el, cls) {
  return el.className && new RegExp('(\\s|^)' + cls + '(\\s|$)').test(el.className);
}

function addClass(elem, className) {
  if (!hasClass(elem, className)) {
    elem.className += ' ' + className;
  }
}

function removeClass(elem, className) {
  var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
  if (hasClass(elem, className)) {
    while (newClass.indexOf(' ' + className + ' ') >= 0) {
      newClass = newClass.replace(' ' + className + ' ', ' ');
    }
    elem.className = newClass.replace(/^\s+|\s+$/g, '');
  }
}

class SearchLayer extends ol.control.Control {
  constructor(optOptions) {
    const options = optOptions || {};
    if (!options.layer) {
      throw new Error('Missing layer in options');
    }
    if (!options.map) {
      throw new Error('Missing map in options');
    }

    let source;
    if (
      options.layer instanceof ol.layer.Image &&
      options.layer.getSource() instanceof ol.source.ImageVector
    ) {
      source = options.layer.getSource().getSource();
    } else if (options.layer instanceof ol.layer.Vector) {
      source = options.layer.getSource();
    }

    if (source instanceof ol.source.Cluster) {
      source = source.getSource();
    }

    if (!source) {
      throw new Error('Could not resolve vector source from layer');
    }

    const selectRef = { current: null };
    const highlightOverlayRef = { current: null };

    const features = source.getFeatures();
    console.log('Total features:', features.length);

    // ------------------------------------------------------------
    // Detect all searchable attribute names automatically
    // ------------------------------------------------------------
    const ignoredKeys = new Set(
      (options.ignoreFields || ['geometry']).map(k => k.toLowerCase())
    );

    const searchableFields = [];
    const fieldValueMap = {}; // { fieldName: Set(values) }

    if (features.length > 0) {
      const allKeys = new Set();

      features.forEach(feature => {
        const props = feature.getProperties();
        Object.keys(props).forEach(key => {
          if (!ignoredKeys.has(key.toLowerCase())) {
            allKeys.add(key);
          }
        });
      });

      Array.from(allKeys).forEach(key => {
        fieldValueMap[key] = new Set();

        features.forEach(feature => {
          const value = feature.get(key);
          if (value !== undefined && value !== null) {
            const str = String(value).trim();
            if (str !== '') {
              fieldValueMap[key].add(str);
            }
          }
        });

        if (fieldValueMap[key].size > 0) {
          searchableFields.push(key);
        }
      });
    }

    console.log('Detected searchable fields:', searchableFields);

    // ------------------------------------------------------------
    // Sorting helper
    // ------------------------------------------------------------
    function smartSort(values) {
      return [...values].sort((a, b) => {
        const numA = parseFloat((a.match(/^\d+(\.\d+)?/) || [])[0] || NaN);
        const numB = parseFloat((b.match(/^\d+(\.\d+)?/) || [])[0] || NaN);

        const hasNumA = !isNaN(numA);
        const hasNumB = !isNaN(numB);

        if (hasNumA && hasNumB) {
          return numA - numB || a.localeCompare(b);
        }
        return a.localeCompare(b);
      });
    }

    // ------------------------------------------------------------
    // Create button
    // ------------------------------------------------------------
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = options.buttonLabel || '🔍';

    // ------------------------------------------------------------
    // Create form
    // ------------------------------------------------------------
    const form = document.createElement('form');
    form.id = 'search-form';

    const inputContainer = document.createElement('div');
    inputContainer.className =
      'search-layer-input-container search-layer-input-search search-layer-collapsed';

    const fieldInputs = {};     // fieldName -> input/select element
    const fieldDropdowns = {};  // fieldName -> dropdown element
    const fieldContainers = {}; // fieldName -> wrapper

    // If configured, make selected fields dropdowns instead of text inputs
    const selectFields = new Set((options.selectFields || []).map(String));

    searchableFields.forEach(fieldName => {
      const wrapper = document.createElement('div');
      wrapper.className = 'dynamic-field-container';
      fieldContainers[fieldName] = wrapper;

      const label = document.createElement('label');
      label.textContent = fieldName;
      label.className = 'search-field-label';

      const values = smartSort(fieldValueMap[fieldName]);

      if (selectFields.has(fieldName)) {
        const select = document.createElement('select');
        select.className = 'dynamic-select-input';
        select.innerHTML = `<option value="">Select ${fieldName}</option>`;

        values.forEach(val => {
          const option = document.createElement('option');
          option.value = val;
          option.textContent = val;
          select.appendChild(option);
        });

        fieldInputs[fieldName] = select;
        wrapper.appendChild(label);
        wrapper.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = fieldName;
        input.className = 'dynamic-text-input autocomplete-input';

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';

        fieldInputs[fieldName] = input;
        fieldDropdowns[fieldName] = dropdown;

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        wrapper.appendChild(dropdown);
      }

      inputContainer.appendChild(wrapper);
    });

    const searchButton = document.createElement('button');
    searchButton.textContent = 'Search';
    searchButton.type = 'submit';
    searchButton.className = 'search-btn';

    inputContainer.appendChild(searchButton);
    form.appendChild(inputContainer);

    // ------------------------------------------------------------
    // Build main control element
    // ------------------------------------------------------------
    const element = document.createElement('div');
    element.className = 'search-layer ol-unselectable ol-control';
    element.appendChild(button);
    element.appendChild(form);

    super({ element: element, target: options.target });

    // ------------------------------------------------------------
    // Select interaction
    // ------------------------------------------------------------
    const select = new ol.interaction.Select({
      layers: [options.layer],
      condition: ol.events.condition.never
    });
    selectRef.current = select;
    options.map.addInteraction(select);

    // ------------------------------------------------------------
    // Highlight overlay
    // ------------------------------------------------------------
    const highlightStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({ color: '#ff0000', width: 4 }),
      fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.4)' }),
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({ color: 'rgba(255,0,0,0.5)' }),
        stroke: new ol.style.Stroke({ color: '#ff0000', width: 2 })
      })
    });

    const highlightSource = new ol.source.Vector();
    const highlightLayer = new ol.layer.Vector({
      source: highlightSource,
      style: highlightStyle,
      zIndex: 1000
    });
    options.map.addLayer(highlightLayer);
    highlightOverlayRef.current = highlightLayer;

    // ------------------------------------------------------------
    // State
    // ------------------------------------------------------------
    const currentFieldValues = {};
    searchableFields.forEach(fieldName => {
      currentFieldValues[fieldName] = smartSort(fieldValueMap[fieldName]);
    });

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    function clearHighlights() {
      if (selectRef.current) {
        selectRef.current.getFeatures().clear();
      }
      if (highlightOverlayRef.current) {
        highlightOverlayRef.current.getSource().clear();
      }
    }

    function clearAllInputs() {
      searchableFields.forEach(fieldName => {
        const el = fieldInputs[fieldName];
        if (!el) return;
        el.value = '';
        if (fieldDropdowns[fieldName]) {
          fieldDropdowns[fieldName].style.display = 'none';
        }
        currentFieldValues[fieldName] = smartSort(fieldValueMap[fieldName]);
      });
    }

    function toggleHideShowInput() {
      const container = inputContainer;
      if (hasClass(container, 'search-layer-collapsed')) {
        removeClass(container, 'search-layer-collapsed');
      } else {
        clearAllInputs();
        addClass(container, 'search-layer-collapsed');
        clearHighlights();
      }
    }

    function getFieldValue(feature, fieldName) {
      const value = feature.get(fieldName);
      if (value === undefined || value === null) return '';
      return String(value).trim();
    }

    function updateDropdown(input, dropdown, availableItems, fieldName) {
      const query = input.value.trim();
      dropdown.innerHTML = '';

      if (!query || query.length < 1) {
        dropdown.style.display = 'none';
        return;
      }

      const matches = availableItems.filter(item =>
        item.toLowerCase().includes(query.toLowerCase())
      );

      smartSort(matches).slice(0, 8).forEach(item => {
        const div = document.createElement('div');
        div.textContent = item;
        div.className = 'autocomplete-item';
        div.addEventListener('click', () => {
          input.value = item;
          dropdown.style.display = 'none';
          performSearch();
        });
        dropdown.appendChild(div);
      });

      dropdown.style.display = matches.length > 0 ? 'block' : 'none';
    }

    function performSearch() {
      const searchValues = {};

      searchableFields.forEach(fieldName => {
        const el = fieldInputs[fieldName];
        const value = el && typeof el.value === 'string' ? el.value.trim() : '';
        if (value) {
          searchValues[fieldName] = value;
        }
      });

      console.log('SEARCH VALUES:', searchValues);

      if (Object.keys(searchValues).length === 0) {
        clearHighlights();
        return;
      }

      const matchedFeatures = features.filter(feature => {
        return Object.keys(searchValues).every(fieldName => {
          const featureValue = getFieldValue(feature, fieldName);
          const inputValue = searchValues[fieldName];

          // exact match by default
          if (options.partialMatchFields && options.partialMatchFields.includes(fieldName)) {
            return featureValue.toLowerCase().includes(inputValue.toLowerCase());
          }

          return featureValue.toLowerCase() === inputValue.toLowerCase();
        });
      });

      console.log('FOUND MATCHES:', matchedFeatures.length);

      clearHighlights();

      if (matchedFeatures.length > 0) {
        matchedFeatures.forEach(feature => {
          selectRef.current.getFeatures().push(feature);
          highlightOverlayRef.current.getSource().addFeature(feature.clone());
        });

        let totalExtent = null;

        matchedFeatures.forEach(feature => {
          const geom = feature.getGeometry();
          if (geom) {
            const extent = geom.getExtent();
            if (!ol.extent.isEmpty(extent)) {
              totalExtent = totalExtent
                ? ol.extent.extend(totalExtent, extent)
                : extent.slice();
            }
          }
        });

        if (totalExtent && !ol.extent.isEmpty(totalExtent)) {
          options.map.getView().fit(totalExtent, {
            padding: [20, 20, 20, 20],
            duration: 1000,
            maxZoom: options.maxZoom || 22,
            constrainResolution: false
          });
        }
      } else {
        console.warn('No matches found');
      }
    }

    function updateFieldSuggestions(fieldName) {
      const input = fieldInputs[fieldName];
      const dropdown = fieldDropdowns[fieldName];
      if (!input || !dropdown) return;

      let availableItems = smartSort(fieldValueMap[fieldName]);

      // optional narrowing based on other selected fields
      const activeFilters = {};
      searchableFields.forEach(otherField => {
        if (otherField === fieldName) return;
        const val = fieldInputs[otherField] && fieldInputs[otherField].value
          ? fieldInputs[otherField].value.trim()
          : '';
        if (val) {
          activeFilters[otherField] = val.toLowerCase();
        }
      });

      if (Object.keys(activeFilters).length > 0) {
        const filteredSet = new Set();

        features.forEach(feature => {
          const passes = Object.keys(activeFilters).every(otherField => {
            const featureVal = getFieldValue(feature, otherField).toLowerCase();
            return featureVal === activeFilters[otherField];
          });

          if (passes) {
            const thisValue = getFieldValue(feature, fieldName);
            if (thisValue) filteredSet.add(thisValue);
          }
        });

        availableItems = smartSort(filteredSet);
      }

      currentFieldValues[fieldName] = availableItems;
      updateDropdown(input, dropdown, availableItems, fieldName);
    }

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    searchableFields.forEach(fieldName => {
      const el = fieldInputs[fieldName];

      if (!el) return;

      if (el.tagName === 'INPUT') {
        el.addEventListener('input', () => updateFieldSuggestions(fieldName));
        el.addEventListener('focus', () => updateFieldSuggestions(fieldName));

        el.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
          } else if (e.key === 'Escape') {
            if (fieldDropdowns[fieldName]) {
              fieldDropdowns[fieldName].style.display = 'none';
            }
          }
        });
      } else if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => {
          performSearch();
        });
      }
    });

    document.addEventListener('click', e => {
      searchableFields.forEach(fieldName => {
        const dropdown = fieldDropdowns[fieldName];
        const container = fieldContainers[fieldName];
        if (dropdown && container && !container.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      performSearch();
    });

    button.addEventListener('click', toggleHideShowInput);
  }
}
