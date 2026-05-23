class ThaiAddressAutocomplete {
    constructor(elements  = {}) {
        const {
            subdistrictInput,
            districtInput,
            provinceInput,
            zipcodeInput,
            suggestionsDiv,
        } = elements 

        this.subdistrictInput = subdistrictInput;
        this.districtInput = districtInput;
        this.provinceInput = provinceInput;
        this.zipcodeInput = zipcodeInput;
        this.suggestionsDiv = suggestionsDiv;

        this.currentFocus = -1;
        this.filteredResults = [];

        this.init();
    }

    init() {
        // เพิ่ม event listeners
        this.subdistrictInput.addEventListener('input', (e) => this.handleInput(e));
        this.subdistrictInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.subdistrictInput.addEventListener('focus', (e) => this.handleInput(e));

        // ซ่อน suggestions เมื่อคลิกข้างนอก
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-group')) {
                this.hideSuggestions();
            }
        });
    }

    handleInput(e) {
        const query = e.target.value.trim();

        if (query.length === 0) {
            this.hideSuggestions();
            this.clearAddressInfo();
            return;
        }

        this.showSuggestions(query);
    }


    showSuggestions(query) {
        // กรองข้อมูลที่ตรงกับคำค้นหา
        this.filteredResults = thaiAddressData.filter((item) =>
            item.t.includes(query) || item.t.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 30); // จำกัดผลลัพธ์สูงสุด 10 รายการ

        if (this.filteredResults.length === 0) {
            this.hideSuggestions();
            this.clearAddressInfo();
            return;
        }

        // สร้าง HTML สำหรับ suggestions
        let html = '';
        this.filteredResults.forEach((item, index) => {
            const highlighted = item.t.replace(
                new RegExp(`(${query})`, 'gi'),
                '<strong>$1</strong>'
            );

            html += `
                        <div class="suggestion-item" data-index="${index}">
                            ${highlighted} - ${item.a}, ${item.c} (${item.z})
                        </div>
                    `;
        });

        this.suggestionsDiv.innerHTML = html;
        this.suggestionsDiv.style.display = 'block';

        // เพิ่ม event listeners สำหรับ suggestions
        this.suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.selectSuggestion(index);
            });
        });

        this.currentFocus = -1;
    }

    hideSuggestions() {
        this.suggestionsDiv.style.display = 'none';
        this.currentFocus = -1;
    }

    handleKeydown(e) {
        const suggestions = this.suggestionsDiv.querySelectorAll('.suggestion-item');

        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.currentFocus = this.currentFocus < suggestions.length - 1 ?
                this.currentFocus + 1 : 0;
            this.highlightSuggestion();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.currentFocus = this.currentFocus > 0 ?
                this.currentFocus - 1 : suggestions.length - 1;
            this.highlightSuggestion();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.currentFocus >= 0) {
                this.selectSuggestion(this.currentFocus);
            }
        } else if (e.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    highlightSuggestion() {
        const suggestions = this.suggestionsDiv.querySelectorAll('.suggestion-item');

        suggestions.forEach(item => item.classList.remove('highlighted'));

        if (this.currentFocus >= 0 && this.currentFocus < suggestions.length) {
            suggestions[this.currentFocus].classList.add('highlighted');
        }
    }

    selectSuggestion(index) {
        if (index >= 0 && index < this.filteredResults.length) {
            const selectedItem = this.filteredResults[index];
            this.fillAddressForm(selectedItem);
            this.hideSuggestions();
        }
    }

    fillAddressForm(addressItem) {
        this.subdistrictInput.value = addressItem.t;
        this.districtInput.value = addressItem.a;
        this.provinceInput.value = addressItem.c;
        this.zipcodeInput.value = addressItem.z;

        const inputEvent = new Event('change', { bubbles: true });
        this.subdistrictInput.dispatchEvent(inputEvent);
        this.districtInput.dispatchEvent(inputEvent);
        this.provinceInput.dispatchEvent(inputEvent);
        this.zipcodeInput.dispatchEvent(inputEvent);
    }

    clearAddressInfo() {
        this.districtInput.value = '';
        this.provinceInput.value = '';
        this.zipcodeInput.value = '';
    }
}