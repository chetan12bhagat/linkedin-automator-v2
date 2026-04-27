"""
LinkedIn Easy Apply Automation Bot
Uses Selenium to automate LinkedIn job applications
"""

import json
import time
import os
import sys
import logging
import traceback
from pathlib import Path
from typing import Optional

from selenium import webdriver # type: ignore
from selenium.webdriver.common.by import By # type: ignore
from selenium.webdriver.common.keys import Keys # type: ignore
from selenium.webdriver.chrome.service import Service # type: ignore
from selenium.webdriver.chrome.options import Options # type: ignore
from selenium.webdriver.support.ui import WebDriverWait, Select # type: ignore
from selenium.webdriver.support import expected_conditions as EC # type: ignore
from selenium.common.exceptions import ( # type: ignore
    TimeoutException, NoSuchElementException, ElementNotInteractableException,
    StaleElementReferenceException
)
from webdriver_manager.chrome import ChromeDriverManager # type: ignore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('linkedin_bot.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)


class LinkedInBot:
    def __init__(self, profile: dict, status_callback=None):
        self.profile = profile
        self.status_callback = status_callback or (lambda msg, level="info": None)
        self.driver: webdriver.Chrome = None # type: ignore
        self.wait: WebDriverWait = None # type: ignore
        self.applied_jobs = []
        self.failed_jobs = []
        self.skipped_jobs = []

    def emit(self, message: str, level: str = "info"):
        logger.info(f"[{level.upper()}] {message}")
        self.status_callback(message, level)

    def setup_driver(self):
        """Initialize Chrome WebDriver"""
        driver = self.driver
        if driver is not None:
            try:
                _ = driver.current_url
                self.emit("Browser already running")
                return
            except:
                self.emit("Browser stale, restarting...")
                try:
                    driver.quit()
                except:
                    pass
                self.driver = None

        self.emit("🚀 Starting Chrome browser...")
        try:
            options = Options()
            options.add_argument("--start-maximized")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option("useAutomationExtension", False)
            options.add_argument("--disable-notifications")

            # Optional: add user data dir to stay logged in
            user_data = self.profile.get("chrome_profile_path", "")
            if user_data and os.path.exists(user_data):
                options.add_argument(f"--user-data-dir={user_data}")

            # Let Selenium's built-in manager handle the driver automatically
            new_driver = webdriver.Chrome(options=options)
            if new_driver is None:
                raise Exception("WebDriver initialization returned None")
            
            self.driver = new_driver
            new_driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.wait = WebDriverWait(new_driver, 15)
            self.emit("✅ Chrome browser launched successfully", "success")
        except Exception as e:
            self.emit(f"❌ Failed to launch Chrome: {str(e)}", "error")
            self.driver = None
            self.wait = None
            raise

    def login(self):
        """Login to LinkedIn"""
        driver: webdriver.Chrome = self.driver # type: ignore
        wait: WebDriverWait = self.wait # type: ignore
        if driver is None or wait is None:
            self.emit("❌ Browser not initialized", "error")
            return False
            
        self.emit("🔐 Navigating to LinkedIn login...")
        driver.get("https://www.linkedin.com/login")
        time.sleep(2)

        try:
            email_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
            email_field.clear()
            email_field.send_keys(self.profile["email"])

            password_field = driver.find_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(self.profile["password"])
            password_field.send_keys(Keys.RETURN)

            self.emit("⏳ Waiting for login to complete...")
            time.sleep(4)

            # Check if login was successful
            current_url = driver.current_url
            if "feed" in current_url or "mynetwork" in current_url:
                self.emit("✅ Successfully logged into LinkedIn!", "success")
                return True
            elif "checkpoint" in current_url:
                self.emit("⚠️ LinkedIn requires verification. Please complete it manually in the browser.", "warning")
                time.sleep(15)  # Give user time to verify
                return True
            else:
                self.emit("❌ Login may have failed. Check credentials.", "error")
                return False

        except Exception as e:
            self.emit(f"❌ Login failed: {str(e)}", "error")
            return False

    def search_jobs(self, job_title: str, location: str, filters: dict):
        """Search for jobs on LinkedIn"""
        self.emit(f"🔍 Searching for '{job_title}' jobs in '{location}'...")

        # Build search URL
        base_url = "https://www.linkedin.com/jobs/search/?"
        params = f"keywords={job_title.replace(' ', '%20')}&location={location.replace(' ', '%20')}"
        params += "&f_LF=f_AL"  # Easy Apply filter

        # Experience level filter
        exp_level = filters.get("experience_level", "")
        exp_map = {
            "internship": "1",
            "entry": "2",
            "associate": "3",
            "mid-senior": "4",
            "director": "5",
            "executive": "6"
        }
        if exp_level and exp_level in exp_map:
            params += f"&f_E={exp_map[exp_level]}"

        # Job type filter
        job_type = filters.get("job_type", "")
        type_map = {
            "full-time": "F",
            "part-time": "P",
            "contract": "C",
            "temporary": "T",
            "internship": "I",
            "volunteer": "V"
        }
        if job_type and job_type in type_map:
            params += f"&f_JT={type_map[job_type]}"

        # Date posted filter
        date_posted = filters.get("date_posted", "")
        date_map = {
            "past_1h": "r3600",
            "past_24h": "r86400",
            "past_week": "r604800",
            "past_month": "r2592000"
        }
        if date_posted and date_posted in date_map:
            params += f"&f_TPR={date_map[date_posted]}"

        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None:
            self.emit("❌ Browser not initialized", "error")
            return False
            
        driver.get(base_url + params)
        self.emit("⏳ Waiting for search results to load...")
        time.sleep(5)  # Give AJAX more time
        
        # Check if no results found
        no_results_selectors = [".jobs-search-no-results-banner", ".jobs-search-two-pane__no-results-banner"]
        for sel in no_results_selectors:
            if driver.find_elements(By.CSS_SELECTOR, sel):
                self.emit("⚠️ LinkedIn reports: No jobs found for this search.", "warning")
                return False

        self.emit(f"✅ Job search results loaded", "success")
        return True

    def get_job_listings(self, max_jobs: int = 20):
        """Collect job listing elements"""
        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return []
        
        self.emit(f"📋 Collecting up to {max_jobs} job listings...")
        
        # More robust selectors for the job list
        selectors = [
            "div.scaffold-layout__list-container",
            "ul.scaffold-layout__list-container",
            "div.jobs-search-results-list",
            "ul.jobs-search-results__list",
            "div[data-view-name='job-card']",
            ".jobs-search-results-list"
        ]
        
        job_list_container = None
        for selector in selectors:
            try:
                # Use a slightly longer wait and check for visibility
                job_list_container = WebDriverWait(driver, 12).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
                )
                if job_list_container:
                    self.emit(f"🎯 Found job list via: {selector}")
                    break
            except:
                continue

        if not job_list_container:
            # Fallback scan
            try:
                job_cards = driver.find_elements(By.CSS_SELECTOR, "li[data-occludable-job-id], .job-card-container, .jobs-search-results-list__item")
                if job_cards:
                    return job_cards[:max_jobs]
            except: pass
            
            self.emit("⚠️ Could not find job container. Layout might be complex.", "warning")

        try:
            # Scroll to load - scroll more if more jobs are requested
            scroll_container = job_list_container or driver.find_element(By.TAG_NAME, "body")
            scroll_times = 5 if max_jobs <= 25 else 10 if max_jobs <= 50 else 20
            for _ in range(scroll_times):
                if self.driver is None: break
                driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scroll_container)
                time.sleep(1.5)
            
            if self.driver is None: return []
            job_cards = driver.find_elements(By.CSS_SELECTOR, "li[data-occludable-job-id], .job-card-container, .jobs-search-results-list__item, li.jobs-search-results__list-item")
            
            self.emit(f"📌 Found {len(job_cards)} job listings", "info")
            return job_cards[:max_jobs]

        except Exception as e:
            self.emit(f"⚠️ Error collecting job listings: {str(e)}", "warning")
            return []

    def apply_to_job(self, job_card):
        """Click on a job and attempt Easy Apply"""
        driver = self.driver
        if driver is None: return False

        try:
            # Robust click with retry for staleness
            for _ in range(2):
                try:
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", job_card)
                    time.sleep(1)
                    job_card.click()
                    break
                except StaleElementReferenceException:
                    self.emit("⚠️ Card became stale during click. Trying to pick it again...", "warning")
                    return "stale"
            
            time.sleep(2.5)

            # Extract job details
            details_selectors = {
                "title": ["h1.job-details-jobs-unified-top-card__job-title", "h2.t-24", ".jobs-unified-top-card__job-title"],
                "company": ["div.job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name", "a.app-aware-link"]
            }
            
            job_title = "Unknown Position"
            for sel in details_selectors["title"]:
                try:
                    job_title = driver.find_element(By.CSS_SELECTOR, sel).text.strip()
                    break
                except: continue

            company = "Unknown Company"
            for sel in details_selectors["company"]:
                try:
                    company = driver.find_element(By.CSS_SELECTOR, sel).text.strip()
                    break
                except: continue

            self.emit(f"📌 Viewing: {job_title} at {company}")

            # --- Applicant Count Filter ---
            try:
                applicant_text = ""
                # Try multiple common selectors for applicant count
                count_selectors = [
                    ".jobs-unified-top-card__applicant-count",
                    ".jobs-unified-top-card__subtitle-item",
                    ".jobs-details-premium-insight__content-container span",
                    "span.t-black--light.mt2"
                ]
                
                for sel in count_selectors:
                    try:
                        elements = driver.find_elements(By.CSS_SELECTOR, sel)
                        for el in elements:
                            txt = el.text.strip().lower()
                            if "applicant" in txt:
                                applicant_text = txt
                                break
                        if applicant_text: break
                    except: continue

                if applicant_text:
                    import re
                    # Check for "Over 100" or similar
                    is_over = "over" in applicant_text or ">" in applicant_text
                    nums = re.findall(r'\d+', applicant_text)
                    if nums:
                        count = int(nums[0])
                        if count >= 100 or (is_over and count >= 100):
                            self.emit(f"⏭️ Skipping: {job_title} has {applicant_text} (Target < 100)", "warning")
                            self.skipped_jobs.append({"title": job_title, "company": company, "reason": f"Too many: {applicant_text}"})
                            return False
                        self.emit(f"📊 Applicants: {applicant_text}")
            except Exception as e:
                logger.debug(f"Applicant check failed: {str(e)}")
            # ------------------------------

            # Look for Easy Apply button
            easy_apply_btn = None
            selectors = [
                "button.jobs-apply-button",
                "button[aria-label*='Easy Apply']",
                ".jobs-apply-button--top-card"
            ]

            for selector in selectors:
                try:
                    btn = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    if "Easy Apply" in btn.text or "easy-apply" in btn.get_attribute("class", "").lower():
                        easy_apply_btn = btn
                        break
                    elif "Easy Apply" in (btn.get_attribute("aria-label") or ""):
                        easy_apply_btn = btn
                        break
                except:
                    continue

            if not easy_apply_btn:
                self.emit(f"⏭️ Skipping (no Easy Apply): {job_title} at {company}", "warning")
                self.skipped_jobs.append({"title": job_title, "company": company, "reason": "No Easy Apply"})
                return False

            self.emit(f"✨ Attempting Easy Apply: {job_title} at {company}")
            easy_apply_btn.click() # type: ignore
            time.sleep(2)

            # Fill out the application form
            success = self.fill_application_form(job_title, company)

            if success:
                self.applied_jobs.append({"title": job_title, "company": company})
                self.emit(f"✅ Successfully applied: {job_title} at {company}", "success")
            else:
                self.failed_jobs.append({"title": job_title, "company": company, "reason": "Form fill failed"})

            return success

        except Exception as e:
            self.emit(f"❌ Error applying to job: {str(e)}", "error")
            logger.debug(traceback.format_exc())
            return False

    def fill_application_form(self, job_title: str, company: str, max_steps: int = 10):
        """Fill out the Easy Apply multi-step form"""
        step = 0
        if self.driver is None or self.wait is None:
            return False
            
        driver: webdriver.Chrome = self.driver # type: ignore
        wait: WebDriverWait = self.wait # type: ignore

        while step < max_steps:
            step += 1
            self.emit(f"📝 Filling form step {step} for {job_title}...")
            time.sleep(1.5)

            # Check if modal is open
            try:
                modal = wait.until( # type: ignore
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.jobs-easy-apply-modal"))
                )
            except:
                self.emit("⚠️ Application modal closed unexpectedly", "warning")
                break

            # Fill text inputs
            self._fill_text_fields()

            # Fill phone number
            self._fill_phone_fields()

            # Handle select dropdowns
            self._fill_select_fields()

            # Handle radio buttons
            self._fill_radio_fields()

            # Upload resume if prompted
            self._upload_resume()

            time.sleep(1)

            # Try to click Next or Submit
            action = self._click_next_or_submit()

            if action == "submitted":
                self.emit(f"🎉 Application SUBMITTED for {job_title} at {company}!", "success")
                time.sleep(2)
                # Close modal if still open
                try:
                    close_btn = driver.find_element(By.CSS_SELECTOR, "button[aria-label='Dismiss']") # type: ignore
                    close_btn.click()
                except:
                    pass
                return True
            elif action == "error":
                self.emit(f"❌ Could not proceed with form", "error")
                # Try to close modal
                try:
                    close_btn = driver.find_element(By.CSS_SELECTOR, "button[aria-label='Dismiss']") # type: ignore
                    close_btn.click()
                    time.sleep(1)
                    # Confirm discard
                    discard_btn = driver.find_element(By.CSS_SELECTOR, "button[data-control-name='discard_application_confirm_btn']") # type: ignore
                    discard_btn.click()
                except:
                    pass
                return False

        return False

    def _fill_text_fields(self):
        """Fill text input fields in the form"""
        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return
        try:
            # Target common input types and textareas
            selectors = [
                "div.jobs-easy-apply-modal input[type='text']",
                "div.jobs-easy-apply-modal input[type='email']",
                "div.jobs-easy-apply-modal input[type='tel']",
                "div.jobs-easy-apply-modal input[type='number']",
                "div.jobs-easy-apply-modal textarea"
            ]
            
            for selector in selectors:
                inputs = driver.find_elements(By.CSS_SELECTOR, selector)
                for inp in inputs:
                    try:
                        if not inp.is_displayed() or not inp.is_enabled():
                            continue
                        
                        label_text = self._get_field_label(inp).lower()
                        current_val = inp.get_attribute("value") or ""

                        if current_val and "@" not in current_val: # Don't skip if it's just a placeholder or default
                             # Special case: phone and email usually pre-filled by LinkedIn, check if valid-ish
                             if any(key in label_text for key in ["phone", "email"]):
                                 pass
                             else:
                                 continue

                        value = self._get_answer_for_field(label_text)
                        if value:
                            # Clear using keys to be more reliable than .clear()
                            inp.send_keys(Keys.CONTROL + "a")
                            inp.send_keys(Keys.BACKSPACE)
                            inp.send_keys(value)
                            time.sleep(0.3)
                    except:
                        continue
        except:
            pass

    def _fill_phone_fields(self):
        """Fill phone number fields"""
        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return
        try:
            phone_inputs = driver.find_elements(
                By.CSS_SELECTOR,
                "input[name*='phone'], input[id*='phone']"
            )
            for inp in phone_inputs:
                try:
                    if not inp.get_attribute("value"):
                        inp.clear()
                        inp.send_keys(self.profile.get("phone", ""))
                except:
                    continue
        except:
            pass

    def _fill_select_fields(self):
        """Handle select dropdown fields"""
        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return
        try:
            selects = driver.find_elements(
                By.CSS_SELECTOR,
                "div.jobs-easy-apply-modal select"
            )
            for sel in selects:
                try:
                    if not sel.is_displayed():
                        continue
                    select = Select(sel)
                    label_text = self._get_field_label(sel).lower()

                    if select.first_selected_option.text.strip() in ["Select an option", "", "-- Select --"]:
                        answer = self._get_select_answer(label_text, [o.text for o in select.options])
                        if answer:
                            select.select_by_visible_text(answer)
                        else:
                            # Select first non-empty option
                            for opt in select.options:
                                if opt.text.strip() and opt.text not in ["Select an option", "-- Select --"]:
                                    select.select_by_visible_text(opt.text)
                                    break
                except:
                    continue
        except:
            pass

    def _fill_radio_fields(self):
        """Handle radio button questions"""
        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return
        try:
            # Find fieldsets with radio groups
            fieldsets = driver.find_elements(
                By.CSS_SELECTOR,
                "div.jobs-easy-apply-modal fieldset"
            )
            for fieldset in fieldsets:
                try:
                    label_text = ""
                    try:
                        label_text = fieldset.find_element(By.CSS_SELECTOR, "legend").text.lower()
                    except:
                        pass

                    radios = fieldset.find_elements(By.CSS_SELECTOR, "input[type='radio']")
                    if not radios:
                        continue

                    # Check if any is selected
                    if any(r.is_selected() for r in radios):
                        continue

                    # Answer yes/no questions
                    answer = self._get_yesno_answer(label_text)

                    for radio in radios:
                        try:
                            # Use driver instead of self.driver
                            radio_label = driver.find_element(
                                By.CSS_SELECTOR, f"label[for='{radio.get_attribute('id')}']"
                            ).text.lower()
                            if answer == "yes" and radio_label in ["yes", "true"]:
                                radio.click()
                                break
                            elif answer == "no" and radio_label in ["no", "false"]:
                                radio.click()
                                break
                        except:
                            continue

                    # If still not answered, click first option
                    if not any(r.is_selected() for r in radios):
                        radios[0].click()
                except:
                    continue
        except:
            pass

    def _upload_resume(self):
        """Upload resume if file input is present"""
        resume_path = self.profile.get("resume_path", "")
        if not resume_path or not os.path.exists(resume_path):
            return

        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return
        try:
            file_inputs = driver.find_elements(
                By.CSS_SELECTOR,
                "div.jobs-easy-apply-modal input[type='file']"
            )
            for file_input in file_inputs:
                try:
                    file_input.send_keys(resume_path)
                    self.emit(f"📎 Resume uploaded: {os.path.basename(resume_path)}", "success")
                    time.sleep(2)
                except:
                    continue
        except:
            pass

    def _get_field_label(self, element) -> str:
        """Get label text for a form element"""
        driver: webdriver.Chrome = self.driver # type: ignore
        if driver is None: return ""
        try:
            elem_id = element.get_attribute("id")
            if elem_id:
                label = driver.find_element(By.CSS_SELECTOR, f"label[for='{elem_id}']")
                return label.text
        except:
            pass

        try:
            parent = element.find_element(By.XPATH, "..")
            return parent.find_element(By.TAG_NAME, "label").text
        except:
            pass

        return element.get_attribute("placeholder") or element.get_attribute("aria-label") or ""

    def _get_answer_for_field(self, label: str) -> Optional[str]:
        """Map field labels to profile answers"""
        p = self.profile
        label = label.lower()
        
        # Exact/Contextual matches
        mappings = {
            "first name": p.get("first_name", ""),
            "last name": p.get("last_name", ""),
            "full name": f"{p.get('first_name', '')} {p.get('last_name', '')}",
            "email": p.get("email", ""),
            "phone": p.get("phone", ""),
            "mobile": p.get("phone", ""),
            "city": p.get("city", ""),
            "state": p.get("state", ""),
            "postal": p.get("zip_code", ""),
            "zip": p.get("zip_code", ""),
            "linkedin": p.get("linkedin_url", ""),
            "website": p.get("website", ""),
            "portfolio": p.get("website", ""),
            "github": p.get("github", ""),
            "salary": str(p.get("expected_salary", "80000")),
            "compensation": str(p.get("expected_salary", "80000")),
            "notice period": "Immediate",
            "availability": "Immediate",
            "notice": "Immediate",
            "gpa": str(p.get("gpa", "4.0")),
            "university": "Standard University",
            "college": "Standard College",
            "degree": p.get("education_level", "Bachelor's"),
        }

        # Check for numeric patterns (experience, years)
        if any(x in label for x in ["years", "experience", "how many"]):
            # Specific skills usually get higher years to pass filters
            if any(skill in label for skill in ["python", "react", "sql", "java", "javascript"]):
                return str(max(3, int(p.get("years_experience", "3"))))
            return str(p.get("years_experience", "3"))
        
        # Check for relocation
        if "relocate" in label:
            return "Yes"
        
        # Check for notice period (if it's a number/text input)
        if "notice period" in label:
            return "Immediate"

        for key, value in mappings.items():
            if key in label and value:
                return value

        return None

    def _get_select_answer(self, label: str, options: list) -> Optional[str]:
        """Pick best option from dropdown"""
        p = self.profile

        if "country" in label or "location" in label:
            country = p.get("country", "United States")
            for opt in options:
                if country.lower() in opt.lower():
                    return opt

        if "experience" in label or "level" in label:
            exp = p.get("experience_level", "entry level")
            for opt in options:
                if exp.lower() in opt.lower():
                    return opt

        if "degree" in label or "education" in label:
            degree = p.get("education_level", "bachelor")
            for opt in options:
                if degree.lower() in opt.lower():
                    return opt

        # Return first non-empty option
        for opt in options:
            if opt.strip() and opt not in ["Select an option", "-- Select --", ""]:
                return opt

        return None

    def _get_yesno_answer(self, label: str) -> str:
        """Answer yes/no questions intelligently"""
        p = self.profile
        label = label.lower()
        
        # Common "Yes" patterns
        yes_patterns = [
            "authorized", "eligible", "citizen", "legal", "right to work",
            "agree", "willing", "available", "open", "certified", "comfortable",
            "completed", "have you", "do you have", "interested", "background check",
            "drug test", "vaccination", "read and understand"
        ]
        
        # Common "No" patterns
        no_patterns = [
            "require sponsorship", "need sponsorship", "h1b", "visa", "sponsorship required",
            "ever been terminated", "criminal record", "felony"
        ]

        for pattern in no_patterns:
            if pattern in label:
                return "no"
        for pattern in yes_patterns:
            if pattern in label:
                return "yes"

        # Default to yes for most questions as they keep the flow moving
        return "yes"

    def _click_next_or_submit(self) -> str:
        """Click Next or Submit button, return action taken"""
        driver = self.driver
        if driver is None: return "error"
        # Try Submit first
        submit_selectors = [
            "button[aria-label='Submit application']",
            "button.artdeco-button--primary[aria-label*='Submit']",
        ]
        for selector in submit_selectors:
            try:
                btn = driver.find_element(By.CSS_SELECTOR, selector)
                if btn.is_displayed() and btn.is_enabled():
                    btn.click()
                    time.sleep(2)
                    return "submitted"
            except:
                continue

        # Try Review
        review_selectors = [
            "button[aria-label='Review your application']",
            "button.artdeco-button--primary[aria-label*='Review']",
        ]
        for selector in review_selectors:
            try:
                btn = driver.find_element(By.CSS_SELECTOR, selector)
                if btn.is_displayed() and btn.is_enabled():
                    btn.click()
                    time.sleep(1.5)
                    return "next"
            except:
                continue

        # Try Next
        next_selectors = [
            "button[aria-label='Continue to next step']",
            "button.artdeco-button--primary[aria-label*='Next']",
            "button.artdeco-button--primary",
        ]
        for selector in next_selectors:
            try:
                buttons = driver.find_elements(By.CSS_SELECTOR, selector)
                for btn in buttons:
                    if btn.is_displayed() and btn.is_enabled() and btn.text.strip():
                        btn_text = btn.text.lower()
                        if any(w in btn_text for w in ["next", "continue", "review"]):
                            btn.click()
                            time.sleep(1.5)
                            return "next"
            except:
                continue

        return "error"

    def run(self, job_title: str, location: str, filters: dict, max_jobs: int = 20):
        """Main run loop"""
        try:
            self.setup_driver()

            if not self.login():
                self.emit("❌ Login failed. Stopping.", "error")
                return self.get_stats()

            self.search_jobs(job_title, location, filters)
            job_cards = self.get_job_listings(max_jobs)

            if not job_cards:
                self.emit("⚠️ No job listings found.", "warning")
                return self.get_stats()

            self.emit(f"🚀 Starting to apply to {len(job_cards)} jobs...")
            
            # Use total count and re-fetch to avoid stale elements
            num_jobs = min(len(job_cards), max_jobs)
            
            for i in range(num_jobs):
                if not self.driver:
                    self.emit("❌ Driver lost during processing", "error")
                    break
                    
                self.emit(f"📊 Processing job {i+1}/{num_jobs}...")
                
                # Re-fetch the cards to ensure we have fresh references
                try:
                    fresh_cards = self.driver.find_elements(By.CSS_SELECTOR, "li[data-occludable-job-id], .job-card-container, .jobs-search-results-list__item, li.jobs-search-results__list-item")
                except:
                    self.emit("⚠️ Could not re-fetch job cards", "warning")
                    break
                
                if i >= len(fresh_cards):
                    self.emit("⚠️ Job list shortened. Stopping early.", "warning")
                    break
                    
                card = fresh_cards[i]
                try:
                    result = self.apply_to_job(card)
                    if result == "stale":
                        # Try one more time re-fetching
                        continue
                except Exception as e:
                    self.emit(f"❌ Error on job {i+1}: {str(e).splitlines()[0]}", "error")
                
                time.sleep(3)

            self.emit("🏁 Automation complete!", "success")
            stats = self.get_stats()
            self.emit(f"📈 Results: {stats['applied']} applied, {stats['skipped']} skipped, {stats['failed']} failed", "success")
            return stats

        except Exception as e:
            self.emit(f"💥 Fatal error: {str(e)}", "error")
            logger.debug(traceback.format_exc())
            return self.get_stats()
        finally:
            self.cleanup()

    def cleanup(self):
        """Close the browser and cleanup"""
        driver = self.driver
        if driver is not None:
            try:
                self.emit("🔚 Closing browser...")
                time.sleep(1)
                driver.quit() # type: ignore
            except:
                pass
            self.driver = None
            self.wait = None

    def get_stats(self):
        return {
            "applied": len(self.applied_jobs),
            "skipped": len(self.skipped_jobs),
            "failed": len(self.failed_jobs),
            "applied_jobs": self.applied_jobs,
            "failed_jobs": self.failed_jobs,
            "skipped_jobs": self.skipped_jobs,
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python linkedin_bot.py <config.json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        config = json.load(f)

    def print_status(msg, level="info"):
        print(f"[{level.upper()}] {msg}", flush=True)

    bot = LinkedInBot(config["profile"], status_callback=print_status)
    stats = bot.run(
        job_title=config["search"]["job_title"],
        location=config["search"]["location"],
        filters=config["search"].get("filters", {}),
        max_jobs=config["search"].get("max_jobs", 20)
    )
    print(json.dumps(stats))
