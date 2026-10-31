import omit from 'lodash/omit'
import { Albums } from '@/types/responses/album'
import PreviewList from './preview-list'

describe('PreviewList Component', () => {
  const componentProps = {
    title: 'Most played',
    moreRoute: '/most-played',
    moreTitle: 'See more',
  }

  beforeEach(() => {
    cy.mockCoverArt()
  })

  it('should mount the component and show the albums', () => {
    cy.fixture('albums/mostPlayed').then((albums: Albums[]) => {
      cy.mount(
        <PreviewList
          list={albums}
          title={componentProps.title}
          showMore={true}
          moreRoute={componentProps.moreRoute}
          moreTitle={componentProps.moreTitle}
        />,
      )

      cy.getByTestId('preview-list-title').should(
        'have.text',
        componentProps.title,
      )

      cy.getByTestId('preview-list-show-more')
        .should('have.text', componentProps.moreTitle)
        .and('have.attr', 'href', componentProps.moreRoute)

      cy.getByTestId('preview-list-prev-button').as('prevButton')
      cy.getByTestId('preview-list-next-button').as('nextButton')

      cy.get('@prevButton').should('exist').and('be.visible')
      cy.get('@nextButton').should('exist').and('be.visible')

      albums.forEach((album, index) => {
        cy.getByTestId(`preview-list-carousel-item-${index}`).as(
          'activeCarousel',
        )

        if (index === 8) {
          cy.getByTestId('preview-list-next-button').click()
        }

        cy.get('@activeCarousel')
          .findByTestId('card-image')
          .should('have.attr', 'alt', album.name)

        cy.get('@activeCarousel')
          .findByTestId('card-title')
          .should('have.text', album.name)

        cy.get('@activeCarousel')
          .findByTestId('card-subtitle')
          .should('have.text', album.artist)
      })
    })
  })

  it('should mount the component but not show the more route', () => {
    cy.fixture('albums/mostPlayed').then((albums: Albums[]) => {
      cy.mount(
        <PreviewList
          list={albums}
          title={componentProps.title}
          showMore={false}
          moreRoute={componentProps.moreRoute}
          moreTitle={componentProps.moreTitle}
        />,
      )

      cy.getByTestId('preview-list-title').should(
        'have.text',
        componentProps.title,
      )

      cy.getByTestId('preview-list-show-more').should('not.exist')

      cy.getByTestId('preview-list-prev-button')
        .should('exist')
        .and('be.visible')

      cy.getByTestId('preview-list-next-button')
        .should('exist')
        .and('be.visible')
    })
  })

  it('fits six complete album cards on HD displays', () => {
    cy.viewport(1280, 720)

    cy.fixture('albums/mostPlayed').then((albums: Albums[]) => {
      cy.mount(
        <PreviewList
          list={albums}
          title={componentProps.title}
          showMore={false}
          moreRoute={componentProps.moreRoute}
          moreTitle={componentProps.moreTitle}
        />,
      )

      cy.getByTestId('preview-list-carousel').should(($rail) => {
        const rail = $rail[0]
        const bounds = rail.getBoundingClientRect()
        const items = rail.children
        expect(items[0].getBoundingClientRect().left).to.be.closeTo(bounds.left, 1)
        expect(items[5].getBoundingClientRect().right).to.be.closeTo(bounds.right, 1)
        expect(items[6].getBoundingClientRect().left).to.be.greaterThan(bounds.right)
      })
    })
  })

  it('scrolls the mobile row with a native swipe without moving the page', () => {
    cy.viewport(390, 844)
    cy.fixture('albums/mostPlayed').then((albums: Albums[]) => {
      cy.mount(<div style={{ padding: 16 }}><PreviewList list={albums} title="Albums" /></div>)
      cy.getByTestId('preview-list-carousel').as('rail')
      cy.get('@rail').realSwipe('toLeft', { x: 280, y: 70, length: 220, step: 20 })
      cy.get('@rail').should(($rail) => {
        expect($rail[0].scrollLeft).to.be.greaterThan(100)
        expect($rail[0].ownerDocument.scrollingElement?.scrollTop).to.equal(0)
      })
      cy.get('@rail').scrollTo('right').should(($rail) => {
        const rail = $rail[0]
        const last = rail.lastElementChild!.getBoundingClientRect()
        const bounds = rail.getBoundingClientRect()
        expect(last.right).to.be.at.most(bounds.right)
        expect(last.left).to.be.at.least(bounds.left)
      })
      cy.getByTestId('preview-list-next-button').should('be.disabled')
      cy.get('@rail').scrollTo('left')
      cy.getByTestId('preview-list-prev-button').should('be.disabled')
    })
  })

  it('should create links for albums with artistId', () => {
    cy.fixture('albums/mostPlayed').then((albums: Albums[]) => {
      cy.mount(
        <PreviewList
          list={albums}
          title={componentProps.title}
          showMore={true}
          moreRoute={componentProps.moreRoute}
          moreTitle={componentProps.moreTitle}
        />,
      )

      albums.forEach((_, index) => {
        cy.getByTestId(`preview-list-carousel-item-${index}`).as(
          'activeCarousel',
        )

        cy.get('@activeCarousel').findByTestId('card-subtitle').should('exist')
        cy.get('@activeCarousel')
          .findByTestId('card-subtitle-link')
          .should('exist')
      })
    })
  })

  it('should not create links for albums without artistId', () => {
    cy.fixture('albums/mostPlayed').then((albums: Albums[]) => {
      const albumsWithoutArtistId = albums.map(
        (album) => omit(album, 'artistId') as Albums,
      )

      cy.mount(
        <PreviewList
          list={albumsWithoutArtistId}
          title={componentProps.title}
          showMore={true}
          moreRoute={componentProps.moreRoute}
          moreTitle={componentProps.moreTitle}
        />,
      )

      albums.forEach((_, index) => {
        cy.getByTestId(`preview-list-carousel-item-${index}`).as(
          'activeCarousel',
        )

        cy.get('@activeCarousel').findByTestId('card-subtitle').should('exist')
        cy.get('@activeCarousel')
          .findByTestId('card-subtitle-link')
          .should('not.exist')
      })
    })
  })
})
