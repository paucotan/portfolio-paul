const fs = require('fs');
const path = require('path');

// Colors for programming languages in the GitHub card style
function getLangColor(lang) {
  const colors = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Ruby': '#701516',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Python': '#3572a5',
    'Shell': '#89e051',
    'C++': '#f34b7d',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Ruby on Rails': '#cc0000',
    'Vue': '#4fc08d',
    'PHP': '#4f5d95'
  };
  return colors[lang] || '#64748b'; // default gray
}

// Map repository category/language to Font Awesome icons
function getCategoryIcon(project) {
  const name = project.name.toLowerCase();
  const lang = (project.language || '').toLowerCase();
  const tech = (project.tech_tags || []).map(t => t.toLowerCase());

  if (name.includes('chrome') || name.includes('extension') || name.includes('assistant')) {
    return 'fa-brands fa-chrome';
  }
  if (lang === 'ruby' || tech.includes('ruby') || tech.includes('rails') || name.includes('rails')) {
    return 'fa-gem';
  }
  if (lang === 'typescript' || lang === 'javascript' || tech.includes('react') || tech.includes('next.js') || name.includes('react')) {
    if (tech.includes('react') || name.includes('react')) return 'fa-brands fa-react';
    return 'fa-brands fa-js';
  }
  if (lang === 'python') {
    return 'fa-brands fa-python';
  }
  if (lang === 'html' || lang === 'css') {
    return 'fa-brands fa-html5';
  }
  if (name.includes('cli') || name.includes('tool') || lang === 'shell') {
    return 'fa-solid fa-terminal';
  }
  return 'fa-solid fa-rocket'; // fallback rocket
}

// Convert ISO date to human readable "time ago" format
function formatTimeAgo(dateString) {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const now = new Date();
  const secondsDiff = Math.floor((now - date) / 1000);
  
  if (secondsDiff < 60) return 'just now';
  const minutesDiff = Math.floor(secondsDiff / 60);
  if (minutesDiff < 60) return `${minutesDiff}m ago`;
  const hoursDiff = Math.floor(minutesDiff / 60);
  if (hoursDiff < 24) return `${hoursDiff}h ago`;
  const daysDiff = Math.floor(hoursDiff / 24);
  if (daysDiff < 30) return `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
  const monthsDiff = Math.floor(daysDiff / 30);
  if (monthsDiff < 12) return `${monthsDiff} month${monthsDiff > 1 ? 's' : ''} ago`;
  
  const yearsDiff = Math.floor(monthsDiff / 12);
  return `${yearsDiff} year${yearsDiff > 1 ? 's' : ''} ago`;
}

// Fetch the list of pinned repository names by scraping GitHub profile
async function fetchPinnedRepositoryNames(username, headers) {
  console.log(`🔍 Scraping pinned repositories list from: https://github.com/${username}`);
  
  try {
    const response = await fetch(`https://github.com/${username}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to load GitHub profile. Status: ${response.status}`);
    }
    const html = await response.text();
    
    // Split by pinned item class to find repo links
    const parts = html.split('class="pinned-item-list-item-content"');
    const pinnedNames = [];
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Regex to find first repo link inside pinned item container, e.g. href="/paucotan/concierge"
      const hrefRegex = new RegExp(`href="\\/${username}\\/([^"\\/\\?\\#\\s]+)"`, 'i');
      const match = part.match(hrefRegex);
      if (match) {
        pinnedNames.push(match[1]);
      }
    }
    
    return pinnedNames;
  } catch (error) {
    console.warn('⚠️ Warning: Profile scraping failed. Fallback to local configuration keys.', error.message);
    return [];
  }
}

// Scrape first image from repo README if it exists
async function fetchReadmeScreenshot(username, repoName, defaultBranch, headers) {
  const url = `https://api.github.com/repos/${username}/${repoName}/readme`;
  console.log(`📖 Attempting to fetch README for image extraction: ${repoName}`);
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return null;
    }
    
    const json = await response.json();
    if (!json.content) return null;
    
    const readmeText = Buffer.from(json.content, 'base64').toString('utf8');
    
    // Match standard markdown image: ![alt](url)
    const mdImageRegex = /!\[.*?\]\((.*?)\)/;
    // Match HTML image tag: <img src="url" ...> or <img ... src="url" ...>
    const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/i;
    
    let imageUrl = null;
    const mdMatch = readmeText.match(mdImageRegex);
    if (mdMatch) {
      imageUrl = mdMatch[1].trim();
    } else {
      const htmlMatch = readmeText.match(htmlImageRegex);
      if (htmlMatch) {
        imageUrl = htmlMatch[1].trim();
      }
    }
    
    if (imageUrl) {
      // Check if the URL is relative
      const isAbsolute = /^(https?:\/\/|data:)/i.test(imageUrl);
      if (!isAbsolute) {
        // Clean relative path: remove leading "./" or "/"
        const cleanPath = imageUrl.replace(/^\.\//, '').replace(/^\//, '');
        // Resolve relative paths to absolute raw content URLs
        imageUrl = `https://raw.githubusercontent.com/${username}/${repoName}/${defaultBranch}/${cleanPath}`;
        console.log(`   🔗 Resolved relative README image: ${imageUrl}`);
      } else {
        console.log(`   🔗 Found absolute README image: ${imageUrl}`);
      }
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.warn(`   ⚠️ Could not extract README image for ${repoName}:`, error.message);
    return null;
  }
}

async function sync() {
  console.log('🌌 Starting Pinned GitHub repositories portfolio synchronization...');

  // 1. Read metadata file
  const metadataPath = path.join(__dirname, 'projects-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Error: projects-metadata.json does not exist. Please create it first.');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const username = config.github_username || 'paucotan';
  const featuredConfig = config.featured_projects || {};
  
  // Setup headers
  const headers = {
    'User-Agent': 'portfolio-github-pinned-sync'
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    console.log('🔑 Using GITHUB_TOKEN authentication.');
  } else {
    console.log('⚠️ No GITHUB_TOKEN found. Requests will be unauthenticated (subject to rate limit).');
  }

  // 2. Fetch pinned repo names
  let pinnedRepoNames = await fetchPinnedRepositoryNames(username, headers);
  
  if (pinnedRepoNames.length === 0) {
    console.log('ℹ️ Falling back to projects defined in projects-metadata.json.');
    pinnedRepoNames = Object.keys(featuredConfig);
  } else {
    console.log(`✅ Scraped pinned repositories: ${pinnedRepoNames.join(', ')}`);
  }

  // 3. Fetch data for each pinned repo in order
  const projects = [];

  for (const repoName of pinnedRepoNames) {
    console.log(`📦 Fetching details for pinned repository: ${repoName}`);
    try {
      const url = `https://api.github.com/repos/${username}/${repoName}`;
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`REST API returned status ${response.status}: ${response.statusText}`);
      }
      
      const repo = await response.json();
      
      // Load configurations override from metadata
      const metaOverride = featuredConfig[repoName] || {};
      
      let screenshots = metaOverride.screenshots || [];
      const defaultBranch = repo.default_branch || 'master';
      
      // If no screenshots are locally configured, try to parse the README
      if (screenshots.length === 0) {
        const readmeImage = await fetchReadmeScreenshot(username, repoName, defaultBranch, headers);
        if (readmeImage) {
          screenshots = [readmeImage];
        }
      }
      
      projects.push({
        name: repoName,
        title: metaOverride.title || repoName,
        description: metaOverride.description || repo.description || 'No description provided.',
        tech_tags: metaOverride.tech_tags || (repo.language ? [repo.language] : []),
        live_demo: metaOverride.live_demo || repo.homepage || '',
        github: repo.html_url,
        screenshots: screenshots,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updated_at: repo.updated_at,
        language: repo.language
      });
      
    } catch (error) {
      console.warn(`❌ Failed to sync pinned repo ${repoName}:`, error.message);
      
      // If a repo fails to fetch but exists in local metadata, add it using local overrides as a fallback
      const metaOverride = featuredConfig[repoName];
      if (metaOverride) {
        console.log(`ℹ️ Recovering ${repoName} from metadata cache...`);
        projects.push({
          name: repoName,
          title: metaOverride.title || repoName,
          description: metaOverride.description || 'No description provided.',
          tech_tags: metaOverride.tech_tags || [],
          live_demo: metaOverride.live_demo || '',
          github: metaOverride.github || `https://github.com/${username}/${repoName}`,
          screenshots: metaOverride.screenshots || [],
          stars: 0,
          forks: 0,
          updated_at: null,
          language: null
        });
      }
    }
  }

  console.log(`⭐ Processing complete. Compiling ${projects.length} project cards.`);

  // 4. Generate HTML for Pinned Projects
  let featuredHtml = '';
  for (const project of projects) {
    const timeAgo = project.updated_at ? formatTimeAgo(project.updated_at) : 'recently';
    
    // Tech tags HTML
    const techTagsHtml = project.tech_tags
      .map(tag => `                                <span class="tech-tag">${tag}</span>`)
      .join('\n');
      
    // Live Demo Link HTML
    let demoLinkHtml = '';
    if (project.live_demo) {
      demoLinkHtml = `                                <a href="${project.live_demo}" class="project-link" aria-label="View live demo" target="_blank">Live Demo</a>`;
    }
    
    // Carousel Slides or Fallback Banner HTML
    let slidesHtml = '';
    let carouselButtonsHtml = '';
    let carouselDotsHtml = '';

    if (project.screenshots && project.screenshots.length > 0) {
      // Slides
      slidesHtml = project.screenshots
        .map((img, idx) => `                                <div class="carousel-slide${idx === 0 ? ' active' : ''}">
                                    <img src="${img}" alt="${project.title} Screenshot ${idx + 1}" loading="lazy">
                                </div>`)
        .join('\n');

      // Prev/Next Arrows
      if (project.screenshots.length > 1) {
        carouselButtonsHtml = `                            <button class="carousel-btn carousel-prev" aria-label="Previous image">
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <button class="carousel-btn carousel-next" aria-label="Next image">
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>`;
      }

      // Dots
      const dotButtons = project.screenshots
        .map((_, idx) => `                                <button class="carousel-dot${idx === 0 ? ' active' : ''}" aria-label="View image ${idx + 1}"></button>`)
        .join('\n');
        
      const dotsStyle = project.screenshots.length <= 1 ? ' style="display:none"' : '';
      carouselDotsHtml = `                            <div class="carousel-dots"${dotsStyle}>
${dotButtons}
                            </div>`;
    } else {
      // Cosmic Nebula Fallback Banner
      const categoryIcon = getCategoryIcon(project);
      slidesHtml = `                                <div class="carousel-slide active">
                                    <div class="fallback-project-banner" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.12) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.05); position: relative;">
                                        <div class="fallback-banner-glow" style="position: absolute; width: 80px; height: 80px; background: rgba(99, 102, 241, 0.15); filter: blur(30px); border-radius: 50%;"></div>
                                        <i class="${categoryIcon}" style="font-size:3rem; color:rgba(129, 140, 248, 0.8); z-index: 1; filter: drop-shadow(0 0 10px rgba(129, 140, 248, 0.4));"></i>
                                    </div>
                                </div>`;
      
      // Still need dots container for javascript compatibility in script.js
      carouselDotsHtml = `                            <div class="carousel-dots" style="display:none">
                                <button class="carousel-dot active" aria-label="View image 1"></button>
                            </div>`;
    }

    // Stars & Forks Stats HTML
    let statsBadgeHtml = '';
    if (project.stars > 0 || project.forks > 0) {
      statsBadgeHtml = `                            <div class="project-stats">`;
      if (project.stars > 0) {
        statsBadgeHtml += `\n                                <span class="stat-badge" title="Stars"><i class="fa-solid fa-star"></i> ${project.stars}</span>`;
      }
      if (project.forks > 0) {
        statsBadgeHtml += `\n                                <span class="stat-badge" title="Forks"><i class="fa-solid fa-code-fork"></i> ${project.forks}</span>`;
      }
      statsBadgeHtml += `\n                            </div>`;
    }

    featuredHtml += `                    <article class="project-card" tabindex="0">
                        <div class="project-carousel">
                            <div class="carousel-container">
${slidesHtml}
                            </div>
${carouselButtonsHtml}
${carouselDotsHtml}
                        </div>
                        <div class="project-content">
                            <div class="project-title-row">
                                <h3 class="project-title">${project.title}</h3>
${statsBadgeHtml}
                            </div>
                            <p class="project-description">
                                ${project.description}
                            </p>
                            <div class="project-tech">
${techTagsHtml}
                            </div>
                            <div class="project-meta-footer">
                                <div class="project-links">
${demoLinkHtml}
                                    <a href="${project.github}" class="project-link" aria-label="View source code" target="_blank">GitHub</a>
                                </div>
                                <span class="project-updated-date">Updated ${timeAgo}</span>
                            </div>
                        </div>
                    </article>\n\n`;
  }

  // 5. Read and Update index.html
  const indexPath = path.join(__dirname, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Error: index.html does not exist.');
    process.exit(1);
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Replace main projects placeholders
  const featuredStart = '<!-- FEATURED_PROJECTS_START -->';
  const featuredEnd = '<!-- FEATURED_PROJECTS_END -->';
  const featuredRegex = new RegExp(`${featuredStart}[\\s\\S]*?${featuredEnd}`);
  
  if (!indexContent.includes(featuredStart) || !indexContent.includes(featuredEnd)) {
    console.error('❌ Error: index.html does not contain the required FEATURED_PROJECTS comment placeholders.');
    process.exit(1);
  }
  
  indexContent = indexContent.replace(featuredRegex, `${featuredStart}\n${featuredHtml}${featuredEnd}`);

  // 6. Strip out the secondary grid boundaries if they are still in index.html
  const otherStart = '<!-- OTHER_PROJECTS_START -->';
  const otherEnd = '<!-- OTHER_PROJECTS_END -->';
  const otherRegex = new RegExp(`\\s*<div class="other-projects-section">[\\s\\S]*?<\\/div>\\s*<\\/div>\\s*<\\/section>`, 'i');
  
  // Instead of complex regex, let's write index.html updates clean in the next step.
  // Actually, we can check if otherStart is still there and remove that section clean.
  
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('🎉 Portfolio website update completed successfully!');
}

sync().catch(err => {
  console.error('❌ Sync script failed:', err);
  process.exit(1);
});
