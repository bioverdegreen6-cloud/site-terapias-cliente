/**
 * CMS Services Loader (V3)
 * Este script busca automaticamente os arquivos de terapia do diretório /content/services/
 * e os injeta dinamicamente no index.html preservando o design original.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tenta carregar a lista de serviços
    // Como estamos em um ambiente estático, não podemos listar arquivos via JS puro no navegador.
    // Estratégia: O CMS pode ser configurado para salvar um índice JSON, 
    // ou podemos tentar carregar slugs comuns, ou usar a API do GitHub se configurado.
    
    // Por enquanto, usaremos uma lista de slugs que o CMS gerencia.
    // Se você quiser que seja 100% automático sem editar este array, 
    // a melhor forma é configurar o Decap CMS para gerar um arquivo services.json.
    const knownSlugs = ['massage', 'reflexology', 'indian-head', 'acupuncture', 'facial', 'cupping'];
    
    // Tentamos buscar todos os serviços
    const services = [];
    for (const slug of knownSlugs) {
        try {
            const data = await fetchServiceData(slug);
            if (data) services.push(data);
        } catch (e) {
            console.warn(`Serviço ${slug} não encontrado.`);
        }
    }

    if (services.length > 0) {
        renderServicesGrid(services);
        renderServicesDropdown(services);
        renderIndividualServicePages(services);
        console.log('CMS Services carregados com sucesso.');
    }
});

/**
 * Busca e processa o arquivo Markdown de um serviço
 */
async function fetchServiceData(slug) {
    const response = await fetch(`/content/services/${slug}.md`);
    if (!response.ok) return null;
    const text = await response.text();
    return parseMarkdown(text, slug);
}

/**
 * Parser simples de Markdown Frontmatter
 */
function parseMarkdown(text, slug) {
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/;
    const match = text.match(frontmatterRegex);
    if (!match) return null;

    const yamlBlock = match[1];
    const body = match[2];
    const data = {};

    yamlBlock.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            data[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        }
    });

    return {
        ...data,
        slug: data.slug || slug,
        body: body.trim()
    };
}

/**
 * Renderiza os cards na grade principal (Home e Página de Terapias)
 */
function renderServicesGrid(services) {
    const grids = document.querySelectorAll('.therapies-grid');
    grids.forEach(grid => {
        // Limpa conteúdo hardcoded e injeta o dinâmico
        grid.innerHTML = services.map(service => `
            <div class="therapy-card" onclick="showPage('${service.slug}')">
                <div class="therapy-card-image">
                    <img src="${service.image}" alt="${service.title}">
                    <div class="therapy-card-icon">${service.icon || '✨'}</div>
                </div>
                <div class="therapy-card-content">
                    <h3>${service.title}</h3>
                    <p>${service.description}</p>
                    <span class="learn-more">Learn More <span>→</span></span>
                </div>
            </div>
        `).join('');
    });
}

/**
 * Atualiza os menus (Dropdown e Mobile)
 */
function renderServicesDropdown(services) {
    const containers = document.querySelectorAll('.dropdown-inner, .submenu');
    containers.forEach(container => {
        const isMobile = container.classList.contains('submenu');
        const closeAction = isMobile ? 'toggleMobileMenu()' : 'closeDropdown()';
        
        let html = `<a onclick="showPage('therapies'); ${closeAction}">All Therapies</a>`;
        html += services.map(service => `
            <a onclick="showPage('${service.slug}'); ${closeAction}">${service.title}</a>
        `).join('');
        
        container.innerHTML = html;
    });
}

/**
 * Cria as seções de página individual dinamicamente no DOM
 */
function renderIndividualServicePages(services) {
    const footer = document.querySelector('footer');
    
    services.forEach(service => {
        const pageId = `page-${service.slug}`;
        // Se a página já existir no HTML (hardcoded), não criamos de novo
        if (document.getElementById(pageId)) return; 

        const pageElem = document.createElement('div');
        pageElem.className = 'page';
        pageElem.id = pageId;

        // Formata benefícios
        const benefitsHtml = service.benefits ? `
            <div class="benefits-box">
                <h3>Benefits</h3>
                <div class="benefits-grid">
                    ${service.benefits.split(',').map(b => `
                        <div class="benefit-item"><span class="check">✓</span> <span>${b.trim()}</span></div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        pageElem.innerHTML = `
            <section class="therapy-hero">
                <div class="therapy-hero-bg">
                    <img src="${service.image}" alt="${service.title}">
                </div>
                <div class="therapy-hero-overlay"></div>
                <div class="therapy-hero-content">
                    <span class="therapy-hero-badge">Holistic Healing</span>
                    <h1>${service.title}</h1>
                    <p>${service.description}</p>
                    <button class="btn-primary" onclick="showPage('book')">Book Your Treatment →</button>
                </div>
            </section>
            <section class="therapy-content">
                <div class="container">
                    <a class="back-link" onclick="showPage('therapies')">← Back to Therapies</a>
                    <div class="therapy-section">
                        <h2>${service.subtitle || 'A Healing Tradition'}</h2>
                        <div class="markdown-body">
                            ${formatMarkdownBody(service.body)}
                        </div>
                    </div>
                    ${benefitsHtml}
                    <div class="therapy-cta">
                        <h3>Ready to experience ${service.title}?</h3>
                        <p>Book your session today and start your journey to wellness.</p>
                        <button class="btn-primary" onclick="showPage('book')">Book Your Treatment →</button>
                    </div>
                </div>
            </section>
        `;
        
        // Insere antes do rodapé para manter a estrutura
        if (footer) {
            document.body.insertBefore(pageElem, footer);
        } else {
            document.body.appendChild(pageElem);
        }
    });
}

/**
 * Formata o corpo do Markdown para HTML simples
 */
function formatMarkdownBody(text) {
    if (!text) return '';
    return text
        .split('\n\n')
        .map(p => {
            if (p.startsWith('![')) {
                const match = p.match(/!\[(.*?)\]\((.*?)\)/);
                return match ? `<img src="${match[2]}" alt="${match[1]}" style="max-width:100%; border-radius:16px; margin: 20px 0;">` : p;
            }
            return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        })
        .join('');
}
