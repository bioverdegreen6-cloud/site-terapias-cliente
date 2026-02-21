/**
 * CMS Services Loader
 * Carrega dinamicamente os serviços do diretório /content/services/
 */

async function loadServices() {
    try {
        // Em um ambiente de produção com Decap CMS (Git Gateway), 
        // não podemos listar arquivos diretamente via JS no navegador.
        // A solução padrão é usar uma API (como a do GitHub) ou gerar um index.json no build.
        // Para este projeto estático, vamos buscar o arquivo de configuração ou 
        // assumir uma convenção de nomes, ou melhor, usar o script de build para gerar a lista.
        
        // No entanto, para Decap CMS puro em site estático sem gerador de site estático (SSG),
        // a forma mais comum de "descobrir" os arquivos é ter um arquivo central de índice
        // ou buscar diretamente da API do GitHub se necessário.
        
        // Para simplificar e manter 100% estático sem dependências complexas,
        // vamos implementar um buscador que tenta carregar serviços conhecidos 
        // ou, se estivermos no Netlify, podemos usar a API de busca.
        
        // ESTRATÉGIA: O Decap CMS salva arquivos em /content/services/*.md.
        // Vamos buscar a lista de serviços.
        
        const servicesList = await fetchServicesList();
        const servicesData = await Promise.all(
            servicesList.map(slug => fetchServiceData(slug))
        );

        renderServicesGrid(servicesData);
        renderServicesDropdown(servicesData);
        renderIndividualServicePages(servicesData);

    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

async function fetchServicesList() {
    // Nota: Em um site puramente estático, listar arquivos é difícil.
    // O ideal seria um script de build gerar um 'services.json'.
    // Como o pedido é para deploy direto, vamos usar uma lista que o CMS pode atualizar
    // ou buscar via API do GitHub se configurado.
    
    // Por enquanto, vamos buscar de um arquivo central 'services.json' que o CMS pode gerenciar
    // ou que podemos gerar. 
    try {
        const response = await fetch('/content/services.json');
        if (response.ok) return await response.json();
    } catch (e) {
        console.warn('Arquivo services.json não encontrado, usando fallback.');
    }
    
    // Fallback para os serviços iniciais conhecidos
    return ['massage', 'reflexology', 'indian-head', 'acupuncture', 'facial', 'cupping'];
}

async function fetchServiceData(slug) {
    const response = await fetch(`/content/services/${slug}.md`);
    const text = await response.text();
    return parseMarkdown(text, slug);
}

function parseMarkdown(text, slug) {
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/;
    const match = text.match(frontmatterRegex);
    
    if (!match) return { slug };

    const yamlBlock = match[1];
    const content = match[2];
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
        longContent: content.trim()
    };
}

function renderServicesGrid(services) {
    const grids = document.querySelectorAll('.therapies-grid');
    grids.forEach(grid => {
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

function renderServicesDropdown(services) {
    const dropdownInners = document.querySelectorAll('.dropdown-inner, .submenu');
    dropdownInners.forEach(container => {
        const isSubmenu = container.classList.contains('submenu');
        const closeAction = isSubmenu ? 'toggleMobileMenu()' : 'closeDropdown()';
        
        let html = `<a onclick="showPage('therapies'); ${closeAction}">All Therapies</a>`;
        html += services.map(service => `
            <a onclick="showPage('${service.slug}'); ${closeAction}">${service.title}</a>
        `).join('');
        
        container.innerHTML = html;
    });
}

function renderIndividualServicePages(services) {
    // Esta função cria dinamicamente as seções de página para cada serviço
    // preservando a estrutura original do HTML.
    
    const body = document.body;
    
    services.forEach(service => {
        const pageId = `page-${service.slug}`;
        let pageElem = document.getElementById(pageId);
        
        if (!pageElem) {
            pageElem = document.createElement('div');
            pageElem.className = 'page';
            pageElem.id = pageId;
            // Inserir antes do rodapé ou no final
            const footer = document.querySelector('footer');
            if (footer) {
                body.insertBefore(pageElem, footer);
            } else {
                body.appendChild(pageElem);
            }
        }

        // Template baseado na estrutura original
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
                        <div class="markdown-content">
                            ${formatContent(service.longContent)}
                        </div>
                    </div>

                    ${service.benefits ? renderBenefits(service.benefits) : ''}

                    <div class="therapy-cta">
                        <h3>Ready to experience ${service.title}?</h3>
                        <p>Book your session today and start your journey to wellness.</p>
                        <button class="btn-primary" onclick="showPage('book')">Book Your Treatment →</button>
                    </div>
                </div>
            </section>
        `;
    });
}

function formatContent(text) {
    if (!text) return '';
    // Simples conversão de markdown para parágrafos e imagens para este caso específico
    return text
        .split('\n\n')
        .map(para => {
            if (para.startsWith('![')) {
                const match = para.match(/!\[(.*?)\]\((.*?)\)/);
                return match ? `<img src="${match[2]}" alt="${match[1]}">` : para;
            }
            return `<p>${para}</p>`;
        })
        .join('');
}

function renderBenefits(benefitsStr) {
    const benefits = benefitsStr.split(',').map(b => b.trim());
    return `
        <div class="benefits-box">
            <h3>Benefits</h3>
            <div class="benefits-grid">
                ${benefits.map(benefit => `
                    <div class="benefit-item"><span class="check">✓</span> <span>${benefit}</span></div>
                `).join('')}
            </div>
        </div>
    `;
}

// Inicializar carregamento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', loadServices);
