async function fetchData(query, variables) {
    const token = localStorage.getItem('jwt');
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
    });
    const data = await response.json();
    console.log("data", data)
    return data.data;
}

async function getUserIdFromToken() {
    const query = `
    query GetCurrentUser {
        user {
            id
        }
    }
    `;

    try {
        const response = await fetchData(query, {});
        return response.user[0].id;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
}

const getTitleData = `
query GetTitleData($userId: Int) {
    event_user(where: { userId: { _eq: $userId }, eventId: { _eq: 20 } }) {
        level
    }
    user(where: { id: { _eq: $userId } }) {
        firstName
        lastName
        email
    }
}
`;

const getAuditData = `
query User($userId: Int) {
    user(where: { id: { _eq: $userId } }) {
        auditRatio
        totalDown
        totalUp
    }
}
`;

const getXpForProjects = `
query Transaction($userId: Int) {
    transaction(
        where: { eventId: { _eq: 20 }, userId: { _eq: $userId }, type: { _eq: "xp" }, object: { type: { _eq: "project" } }  }
        order_by: {createdAt: desc}
    ) {
        amount
        createdAt
        path
    }
}
`;

document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('jwt');
    window.location.href = 'index.html'; // Redirect to login page
});

async function loadProfile() {
    const userId = await getUserIdFromToken();

    if (!userId) {
        console.error('Failed to retrieve user ID');
        return;
    }

    try {
        const titleData = await fetchData(getTitleData, { userId });
        const auditData = await fetchData(getAuditData, { userId });
        const xpForProjects = await fetchData(getXpForProjects, { userId });
        console.log("xpp", xpForProjects)

        // Display user info
        document.getElementById('userName').innerText = `Hello, ${titleData.user[0].firstName} ${titleData.user[0].lastName} !`;
        document.getElementById('email').innerText = ` ${titleData.user[0].email}`
        document.getElementById('userLevel').innerText = `${titleData.event_user[0].level}`;
        document.getElementById('userXP').innerText = ` ${(xpForProjects.transaction.reduce((acc, tx) => acc + tx.amount, 0) / 1000).toFixed(1)} Kb`;
        document.getElementById('audit').innerText = `${(auditData.user[0].auditRatio).toFixed(1)}`;

        // Render graphs
        renderAuditRatio(xpForProjects, auditData);
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

function renderAuditRatio(xpData, auditData) {
   // XP Progress Graph
xpData.transaction.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
const maxXP = Math.max(...xpData.transaction.map(tx => tx.amount));

// xpGraph.style.width = '50%';  // Set container to 50%
// xpGraph.style.overflowX = 'scroll';  // Enable horizontal scroll
// xpGraph.style.overflowY = 'hidden';  // Hide vertical scroll
// xpGraph.style.display = 'block';  // Ensure block display

// Function to determine the color based on XP amount
function getColor(xpAmount, maxXP) {
    const ratio = xpAmount / maxXP;
    if (ratio < 0.33) {
        return '#38a169'; // Green for low XP
    } else if (ratio < 0.66) {
        return '#f6e05e'; // Yellow for medium XP
    } else {
        return '#e53e3e'; // Red for high XP
    }
}
const barWidth = 140;  // Wider spacing between bars
const svgWidth = xpData.transaction.length * barWidth + 100;

const xpGraph = document.getElementById('xpGraph');
xpGraph.style.width = '50%';  

const svgXp = `
    <div style="min-width: ${svgWidth}px; transform: rotateX(180deg)">  
        <svg width="${svgWidth}" height="400" viewBox="0 0 ${svgWidth} 400" preserveAspectRatio="xMidYMid meet" style="transform: rotateX(180deg)">
            <g transform="translate(50, 350)">
                ${xpData.transaction.map((tx, index) => {
                    const height = (tx.amount / maxXP) * 300;
                    const x = index * barWidth + 20;
                    const y = -height;
                    const moduleName = tx.path.split('/').pop();
                    const barColor = getColor(tx.amount,maxXP); // Get color based on XP amount

                    return `
                        <g class="bar">
                            <rect x="${x}" y="${y}" width="80" height="0" fill="${barColor}">
                                <animate attributeName="height" from="0" to="${height}" dur="0.8s" fill="freeze" />
                                <animate attributeName="y" from="0" to="${y}" dur="0.8s" fill="freeze" />
                            </rect>
                            <text x="${x + 40}" y="${-height - 10}" fill="#2d3748" font-size="12" text-anchor="middle">${(tx.amount/1000).toFixed(1)}kb</text>
                            <text x="${x + 40}" y="40" fill="#2d3748" font-size="12" text-anchor="middle">${moduleName}</text>
                        </g>`;
                }).join('')}
                <line x1="0" y1="0" x2="${svgWidth}" y2="0" stroke="#718096" />
            </g>
        </svg>
    </div>`;
xpGraph.innerHTML = svgXp;


    // Audit Ratio Circle
    const ratio = Math.round((auditData.user[0].auditRatio || 0) * 2) / 2;
    const circle = document.getElementById('auditRatioGraph');
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    
    circle.innerHTML = `
        <div class="audit-circle">
            <div class="glow-spinner"></div>
            <svg class="progress-ring" width="200" height="200">
             
                <circle
                    class="progress-ring-circle-bg"
                    stroke="#e2e8f0"
                    stroke-width="12"
                    fill="transparent"
                    r="${radius}"
                    cx="100"
                    cy="100"
                />
                <circle
                    class="progress-ring-circle"
                    stroke="#4299e1"
                    stroke-width="12"
                    fill="transparent"
                    r="${radius}"
                    cx="100"
                    cy="100"
                    style="stroke-dasharray: ${circumference};
                           stroke-dashoffset: ${circumference - (ratio / 3) * circumference}"
                />
            </svg>
        <div class="audit-value">${auditData.user[0].auditRatio.toFixed(1)}</div>
        </div>
    `;
    // document.getElementById('audit').innerText = ` ${Math.round((auditData.user[0].auditRatio || 0) * 2) / 2}`;


    //hover
    const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
document.body.appendChild(tooltip);

xpData.transaction.forEach((tx, index) => {
  const bar = document.querySelector(`.bar:nth-child(${index + 1}) rect`);
  bar.addEventListener('mouseenter', (e) => {
    const details = `Date: ${new Date(tx.createdAt).toLocaleDateString()}<br>
                     Module: ${tx.path.split('/').pop()}<br>
                     Feedback: Passed`;
    tooltip.innerHTML = details;
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.pageX + 10}px`;
    tooltip.style.top = `${e.pageY + 10}px`;
  });
  bar.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
});

//smooth transitions
xpData.transaction.forEach((tx, index) => {
    const bar = document.querySelector(`.bar:nth-child(${index + 1}) rect`);
    const height = (tx.amount / maxXP) * 300;
    const y = -height;
  
    // Animate bar growth
    bar.innerHTML = `
      <animate attributeName="height" from="0" to="${height}" dur="0.8s" fill="freeze" />
      <animate attributeName="y" from="0" to="${y}" dur="0.8s" fill="freeze" />
    `;

    // Animate number counting
    const textElement = document.querySelector(`.bar:nth-child(${index + 1}) text`);
    let counter = 0;
    const countUp = setInterval(() => {
      if (counter >= tx.amount) {
        clearInterval(countUp);
      } else {
        counter += Math.ceil(tx.amount / 50); // Adjust increment speed
        textElement.textContent = counter;
      }
    }, 16); // ~60fps
  });
  
}
loadProfile();
