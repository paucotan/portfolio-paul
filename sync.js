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

async function sync() {
  console.log('🌌 Starting GitHub repositories portfolio synchronization...');

  // 1. Read metadata file
  const metadataPath = path.join(__dirname, 'projects-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Error: projects-metadata.json does not exist. Please create it first.');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const username = config.github_username || 'paucotan';
  const featuredConfig = config.featured_projects || {};
  const excludeList = config.exclude_projects || [];
  
  console.log(`👤 Fetching repositories for user: ${username}`);

  // 2. Fetch public repos from GitHub
  const headers = {
    'User-Agent': 'portfolio-github-sync'
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    console.log('🔑 Using GITHUB_TOKEN authentication.');
  } else {
    console.log('⚠️ No GITHUB_TOKEN found. Requests will be unauthenticated (subject to rate limit).');
  }

  let repos = [];
  try {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden. Set GITHUB_TOKEN environment variable.');
      }
      throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
    }
    
    repos = await response.json();
    console.log(`✅ Successfully fetched ${repos.length} repositories from GitHub.`);
  } catch (error) {
    console.error(`❌ Failed to fetch repositories from GitHub:`, error.message);
    process.exit(1);
  }

  // 3. Process repositories
  const featuredProjects = [];
  const otherProjects = [];

  // Group repos
  for (const repo of repos) {
    const repoName = repo.name;
    
    // Check if it's explicitly excluded
    if (excludeList.includes(repoName)) {
      continue;
    }
    
    // Check if featured
    const metaOverride = featuredConfig[repoName] || Object.values(featuredConfig).find(item => item.github === repo.html_url);
    
    if (metaOverride) {
      featuredProjects.push({
        name: repoName,
        title: metaOverride.title || repoName,
        description: metaOverride.description || repo.description || 'No description provided.',
        tech_tags: metaOverride.tech_tags || (repo.language ? [repo.language] : []),
        live_demo: metaOverride.live_demo || repo.homepage || '',
        github: repo.html_url,
        screenshots: metaOverride.screenshots || [],
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updated_at: repo.updated_at,
        priority: metaOverride.priority !== undefined ? metaOverride.priority : 100
      });
    } else {
      // Put in Open Source/Other Projects if it's not a fork (unless it has stars)
      if (!repo.fork || repo.stargazers_count > 0) {
        otherProjects.push({
          name: repoName,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          github: repo.html_url,
          live_demo: repo.homepage,
          updated_at: repo.updated_at
        });
      }
    }
  }

  // If a featured project is configured in metadata but wasn't found in the API results
  // (e.g. if it is private or was missed), keep it in the list using local metadata values
  for (const [key, value] of Object.entries(featuredConfig)) {
    const found = featuredProjects.some(p => p.name === key || p.github === value.github);
    if (!found) {
      featuredProjects.push({
        name: key,
        title: value.title || key,
        description: value.description || 'No description provided.',
        tech_tags: value.tech_tags || [],
        live_demo: value.live_demo || '',
        github: value.github || `https://github.com/${username}/${key}`,
        screenshots: value.screenshots || [],
        stars: 0,
        forks: 0,
        updated_at: null,
        priority: value.priority !== undefined ? value.priority : 100
      });
    }
  }

  // Sort featured projects by priority ascending, then updated_at descending
  featuredProjects.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.updated_at && b.updated_at) return new Date(b.updated_at) - new Date(a.updated_at);
    return a.name.localeCompare(b.name);
  });

  // Sort other projects by stars descending, then updated_at descending
  otherProjects.sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  console.log(`⭐ Found ${featuredProjects.length} Featured Projects and ${otherProjects.length} Other Open Source Repositories.`);

  // 4. Generate HTML for Featured Projects
  let featuredHtml = '';
  for (const project of featuredProjects) {
    const timeAgo = project.updated_at ? formatTimeAgo(project.updated_at) : 'recently';
    
    // Tech tags HTML
    const techTagsHtml = project.tech_tags
      .map(tag => `                                <span class="tech-tag">${tag}</span>`)
      .join('\n');
      
    // Links HTML
    let demoLinkHtml = '';
    if (project.live_demo) {
      demoLinkHtml = `                                <a href="${project.live_demo}" class="project-link" aria-label="View live demo" target="_blank">Live Demo</a>`;
    }
    
    // Carousel Slides HTML
    let slidesHtml = '';
    if (project.screenshots.length > 0) {
      slidesHtml = project.screenshots
        .map((img, idx) => `                                <div class="carousel-slide${idx === 0 ? ' active' : ''}">
                                    <img src="${img}" alt="${project.title} Screenshot ${idx + 1}" loading="lazy">
                                </div>`)
        .join('\n');
    } else {
      // Fallback if no screenshots: use a placeholder cosmic colored gradient or a generic card image
      slidesHtml = `                                <div class="carousel-slide active">
                                    <div class="fallback-project-banner" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(26, 26, 46, 0.8) 100%);">
                                        <i class="fa-solid fa-rocket" style="font-size:3rem; color:var(--color-purple-light);"></i>
                                    </div>
                                </div>`;
    }

    // Carousel buttons (prev/next) HTML
    let carouselButtonsHtml = '';
    if (project.screenshots.length > 1) {
      carouselButtonsHtml = `                            <button class="carousel-btn carousel-prev" aria-label="Previous image">
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <button class="carousel-btn carousel-next" aria-label="Next image">
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>`;
    }

    // Carousel Dots HTML
    let carouselDotsHtml = '';
    if (project.screenshots.length > 0) {
      const dotButtons = project.screenshots
        .map((_, idx) => `                                <button class="carousel-dot${idx === 0 ? ' active' : ''}" aria-label="View image ${idx + 1}"></button>`)
        .join('\n');
        
      // If only one screenshot, hide dots via inline style but keep the DOM node for compatibility
      const dotsStyle = project.screenshots.length <= 1 ? ' style="display:none"' : '';
      carouselDotsHtml = `                            <div class="carousel-dots"${dotsStyle}>
${dotButtons}
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

  // 5. Generate HTML for Other Open Source Projects
  let otherHtml = '';
  for (const project of otherProjects) {
    const timeAgo = formatTimeAgo(project.updated_at);
    
    // Stats HTML
    let statsHtml = '';
    if (project.stars > 0 || project.forks > 0) {
      statsHtml = `            <div class="other-project-stats">`;
      if (project.stars > 0) {
        statsHtml += `\n                <span class="other-stat-badge" title="Stars"><i class="fa-solid fa-star"></i> ${project.stars}</span>`;
      }
      if (project.forks > 0) {
        statsHtml += `\n                <span class="other-stat-badge" title="Forks"><i class="fa-solid fa-code-fork"></i> ${project.forks}</span>`;
      }
      statsHtml += `\n            </div>`;
    }

    // Demo Link HTML in footer
    let demoLinkIconHtml = '';
    if (project.live_demo) {
      demoLinkIconHtml = `\n                <a href="${project.live_demo}" class="other-project-link-icon" title="Live Demo" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    }

    // Description fallback
    const repoDesc = project.description || 'Open source repository on GitHub.';

    otherHtml += `                        <div class="other-project-card">
                            <div class="other-project-header">
                                <div class="other-project-title-wrapper">
                                    <i class="fa-regular fa-folder other-project-icon"></i>
                                    <h4 class="other-project-title"><a href="${project.github}" target="_blank">${project.name}</a></h4>
                                </div>
${statsHtml}
                            </div>
                            <p class="other-project-description">${repoDesc}</p>
                            <div class="other-project-footer">
                                <div class="other-project-tech-wrapper">
                                    ${project.language ? `<span class="other-project-lang"><span class="lang-color" style="background-color: ${getLangColor(project.language)}"></span>${project.language}</span>` : ''}
                                    <span class="other-project-updated">Updated ${timeAgo}</span>
                                </div>
                                <div class="other-project-links">
${demoLinkIconHtml}
                                    <a href="${project.github}" class="other-project-link-icon" title="GitHub Repository" target="_blank"><i class="fa-brands fa-github"></i></a>
                                </div>
                            </div>
                        </div>\n\n`;
  }

  // 6. Read and Update index.html
  const indexPath = path.join(__dirname, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Error: index.html does not exist.');
    process.exit(1);
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Replace Featured Projects
  const featuredStart = '<!-- FEATURED_PROJECTS_START -->';
  const featuredEnd = '<!-- FEATURED_PROJECTS_END -->';
  const featuredRegex = new RegExp(`${featuredStart}[\\s\\S]*?${featuredEnd}`);
  
  if (!indexContent.includes(featuredStart) || !indexContent.includes(featuredEnd)) {
    console.log('⚠️ Placeholders for Featured Projects not found. We will prepare index.html with comment boundaries first.');
    // Let's create placeholders in index.html in the next steps
  } else {
    indexContent = indexContent.replace(featuredRegex, `${featuredStart}\n${featuredHtml}${featuredEnd}`);
    console.log('✨ Featured projects updated in index.html.');
  }

  // Replace Other Projects
  const otherStart = '<!-- OTHER_PROJECTS_START -->';
  const otherEnd = '<!-- OTHER_PROJECTS_END -->';
  const otherRegex = new RegExp(`${otherStart}[\\s\\S]*?${otherEnd}`);

  if (indexContent.includes(otherStart) && indexContent.includes(otherEnd)) {
    indexContent = indexContent.replace(otherRegex, `${otherStart}\n${otherHtml}${otherEnd}`);
    console.log('✨ Open source repositories updated in index.html.');
  } else {
    console.log('⚠️ Placeholders for Open Source Projects not found.');
  }

  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('🎉 Portfolio website update completed successfully!');
}

sync().catch(err => {
  console.error('❌ Sync script failed:', err);
  process.exit(1);
});
